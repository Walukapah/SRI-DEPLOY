// bot.js
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// 🔐 Bot token and imgbb API key
const TELEGRAM_TOKEN = '7355024353:AAFcH-OAF5l5Fj6-igY4jOtqZ7HtZGRrlYQ';
const IMGBB_API_KEY = 'a508f32e30c7eccca82b71cdcaf9671f';
const CHANNEL_USERNAME = 'walukasri'; // Without '@'

// Create bot instance
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ✅ Fake progress bar generator
function fakeLoadingBar(step) {
    const bars = ["▒▒▒▒▒▒▒▒▒▒", "█▒▒▒▒▒▒▒▒▒", "██▒▒▒▒▒▒▒▒", "███▒▒▒▒▒▒▒", "████▒▒▒▒▒▒",
                 "█████▒▒▒▒▒", "██████▒▒▒▒", "███████▒▒▒", "████████▒▒", "█████████▒", "██████████"];
    return `⏳ Uploading Image...\n[${bars[step]}] ${step * 10}%`;
}

// ✅ Check if user is in channel
async function isUserInChannel(userId, chatId) {
    try {
        const member = await bot.getChatMember(`@${CHANNEL_USERNAME}`, userId);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch (error) {
        console.error('Error checking channel membership:', error);
        return false;
    }
}

// /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!await isUserInChannel(userId, chatId)) {
        await bot.sendMessage(chatId, `🔒 TO USE THIS BOT, JOIN OUR CHANNEL FIRST:\n👉 https://t.me/${CHANNEL_USERNAME}`);
        return;
    }

    await bot.sendMessage(chatId, "📸 SEND ME AN IMAGE TO GET AN IMAGE LINK BY OLD-HACKER");
});

// Handle image uploads
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const messageId = msg.message_id;

    if (!await isUserInChannel(userId, chatId)) {
        await bot.sendMessage(chatId, `🔒 TO USE THIS BOT, JOIN OUR CHANNEL FIRST:\n👉 https://t.me/${CHANNEL_USERNAME}`);
        return;
    }

    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    const filePath = await bot.getFile(fileId);
    const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath.file_path}`;
    const imagePath = `temp_${messageId}.jpg`;

    try {
        // Download the image
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(imagePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Show fake loading bar
        let loadingMsg = await bot.sendMessage(chatId, "⏳ UPLOADING IMAGE...\n[▒▒▒▒▒▒▒▒▒▒] 0%");

        for (let i = 1; i <= 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            await bot.editMessageText(fakeLoadingBar(i), {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
        }

        // Upload to imgBB
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));

        const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData, {
            headers: formData.getHeaders()
        });

        if (uploadRes.data.success) {
            const imageUrl = uploadRes.data.data.url;
            await bot.editMessageText(`✅ IMAGE UPLOADED BY LEGEND:\n${imageUrl}`, {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
        } else {
            await bot.editMessageText("❌ UPLOAD FAILED. TRY AGAIN.", {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
        }
    } catch (error) {
        console.error("❌ Error:", error);
        await bot.sendMessage(chatId, "❌ ERROR UPLOADING IMAGE. TRY AGAIN.");
    } finally {
        // Clean up
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
});

console.log("🤖 Bot is running...");
