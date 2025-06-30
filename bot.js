const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { exec } = require("child_process");
const fs = require('fs');
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");

const app = express();
const port = 3000; // Hardcoded port

// Initialize Telegram Bot with hardcoded token
const bot = new TelegramBot('7355024353:AAFcH-OAF5l5Fj6-igY4jOtqZ7HtZGRrlYQ', { polling: true });

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// Express health check endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'running',
        service: 'WhatsApp Pairing Service',
        timestamp: new Date().toISOString()
    });
});

// Telegram Bot Handlers
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `👋 Welcome to WhatsApp Pairing Bot!\n\nSend me your WhatsApp number to get a pairing code.`);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    
    if (msg.text.startsWith('/')) return;
    
    let num = msg.text.replace(/[^0-9]/g, '');
    
    if (!num) {
        return bot.sendMessage(chatId, '❌ Invalid input. Please send a valid WhatsApp number.');
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: Browsers.macOS("Safari")
        });

        if (!socket.authState.creds.registered) {
            await delay(1500);
            const code = await socket.requestPairingCode(num);
            
            await bot.sendMessage(chatId, `
✅ *Pairing Code Generated!*

Your WhatsApp pairing code is:
\`\`\`
${code}
\`\`\`

This code will expire in a few minutes.`, { parse_mode: 'Markdown' });
        }

        socket.ev.on('creds.update', saveCreds);
        socket.ev.on("connection.update", async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === "open") {
                try {
                    await delay(10000);
                    const sessionData = fs.readFileSync('./session/creds.json');
                    const b64data = Buffer.from(sessionData).toString('base64');
                    
                    const user_jid = jidNormalizedUser(socket.user.id);
                    
                    await socket.sendMessage(user_jid, {
                        text: `SRI-BOT~${b64data}`
                    });
                    
                    const successMsg = `
┏━━━━━━━━━━━━━━
┃ PRABATH MD සැසිය 
┃ සාර්ථකව සම්බන්ධ විය ✅
┗━━━━━━━━━━━━━━━
▬▬▬▬▬▬▬▬▬▬▬▬▬▬
ඔබගේ සැසි දත්ත ඉහත පණිවිඩයේ ඇත. 
මෙය ආරක්ෂිතව ගබඩා කරන්න!
▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
                    
                    await socket.sendMessage(user_jid, { text: successMsg });

                } catch (e) {
                    console.error("Error:", e);
                    exec('pm2 restart prabath');
                }

                await delay(100);
                await removeFile('./session');
                process.exit(0);
            } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                await delay(10000);
                startPairing(num, chatId);
            }
        });
    } catch (err) {
        console.error("Error:", err);
        exec('pm2 restart prabath');
        await removeFile('./session');
        bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
    }
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    exec('pm2 restart prabath');
});

// Start Express server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Telegram bot started and polling...');
});
