// server.js
const express = require('express');
const bodyParser = require('body-parser');
const mega = require('megajs');
const fs = require('fs');
const path = require('path');
const app = express();

// Mega.js configuration
const storage = new mega.Storage({
    email: process.env.MEGA_EMAIL,
    password: process.env.MEGA_PASSWORD
});

app.use(bodyParser.json());

// User authentication
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Check if user exists
    const users = await storage.read('users.json') || [];
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    // Save new user
    users.push({ username, email, password, bots: [] });
    await storage.write('users.json', users);
    
    res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    const users = await storage.read('users.json') || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ success: true, user });
});

// Bot deployment
app.get('/api/bots', async (req, res) => {
    const bots = fs.readdirSync(path.join(__dirname, '../bots'));
    const botData = [];
    
    for (const bot of bots) {
        const srideployPath = path.join(__dirname, `../bots/${bot}/srideploy.json`);
        if (fs.existsSync(srideployPath)) {
            const data = JSON.parse(fs.readFileSync(srideployPath));
            botData.push({
                name: bot,
                ...data
            });
        }
    }
    
    res.json(botData);
});

app.post('/api/deploy', async (req, res) => {
    const { userEmail, botName } = req.body;
    
    // Check if user already has a deployed bot
    const users = await storage.read('users.json') || [];
    const user = users.find(u => u.email === userEmail);
    
    if (user.bots.length >= 1) {
        return res.status(400).json({ error: 'You can only host one bot at a time' });
    }
    
    // Add bot to user's account
    user.bots.push(botName);
    await storage.write('users.json', users);
    
    // Here you would add actual deployment logic to Koyeb
    // This is a placeholder for the deployment process
    const deploymentResult = await deployToKoyeb(botName);
    
    res.json({ success: true, deploymentId: deploymentResult.id });
});

async function deployToKoyeb(botName) {
    // Implement Koyeb API calls here
    // This would actually deploy the bot
    return { id: 'deployment-' + Math.random().toString(36).substr(2, 9) };
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
