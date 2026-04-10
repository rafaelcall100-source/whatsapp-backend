const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const puppeteer = require('puppeteer'); // IMPORTANTE

const app = express();
app.use(cors());
app.use(express.json());

// =======================
let qrCode = null;
let isConnected = false;
let clientReady = false;

// =======================
// CLIENT WHATSAPP
// =======================
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: {
        headless: true,
        executablePath: puppeteer.executablePath(), // 🔥 AUTOMÁTICO
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

// =======================
// EVENTOS
// =======================

client.on('qr', async (qr) => {
    console.log('📲 QR gerado');
    qrCode = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    isConnected = true;
    clientReady = true;
    qrCode = null;
});

client.on('disconnected', () => {
    console.log('❌ Desconectado');
    isConnected = false;
    clientReady = false;

    setTimeout(() => {
        client.initialize();
    }, 5000);
});

client.on('message', msg => {
    if (msg.from === 'status@broadcast') return;
    if (msg.from.includes('@g.us')) return;

    console.log(`📩 ${msg.from}: ${msg.body}`);
});

client.initialize();

// =======================
// ROTAS
// =======================

app.get('/', (req, res) => {
    res.send('🚀 ONLINE');
});

app.get('/qr', (req, res) => {
    if (!qrCode) return res.send('⏳ Aguarde QR...');

    res.send(`<img src="${qrCode}" />`);
});

app.get('/status', (req, res) => {
    res.json({ connected: isConnected });
});

app.get('/send-simple', async (req, res) => {
    const { number, message } = req.query;

    if (!number || !message) {
        return res.send('Informe number e message');
    }

    if (!clientReady) {
        return res.send('WhatsApp não pronto');
    }

    try {
        await client.sendMessage(number + "@c.us", message);
        res.send('Enviado 🚀');
    } catch (err) {
        res.send('Erro: ' + err.message);
    }
});

// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 Rodando na porta', PORT);
});