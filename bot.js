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
    Browsers
} = require("@whiskeysockets/baileys");

const app = express();
const port = 3000;

// Initialize Telegram Bot
const bot = new TelegramBot('7355024353:AAFcH-OAF5l5Fj6-igY4jOtqZ7HtZGRrlYQ', { polling: true });

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// Express routes
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
        const { state, saveCreds } = await useMultiFileAuthState('./session');
        const socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
            },
            logger: pino({ level: "fatal" }),
            browser: Browsers.macOS("Desktop")
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
        socket.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === "open") {
                try {
                    await delay(3000);
                    const sessionData = fs.readFileSync('./session/creds.json');
                    const b64data = Buffer.from(sessionData).toString('base64');
                    
                    await socket.sendMessage(socket.user.id, {
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
                    
                    await socket.sendMessage(socket.user.id, { text: successMsg });

                    await delay(100);
                    await removeFile('./session');
                    process.exit(0);
                } catch (e) {
                    console.error("Session error:", e);
                    exec('pm2 restart sribot');
                }
            } 
            else if (connection === "close") {
                if (lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    exec('pm2 restart sribot');
                }
            }
        });
    } catch (err) {
        console.error("Main error:", err);
        exec('pm2 restart sribot');
        removeFile('./session');
        bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
    }
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    exec('pm2 restart sribot');
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    exec('pm2 restart sribot');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Telegram bot started');
});
