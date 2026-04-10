const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// VARIÁVEIS
// =======================
let qrCode = null;
let isConnected = false;

// =======================
// CLIENT WHATSAPP
// =======================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// =======================
// EVENTOS
// =======================

// QR
client.on('qr', async (qr) => {
    console.log('📲 QR gerado');
    qrCode = await qrcode.toDataURL(qr);
});

// CONECTADO
client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    isConnected = true;
    qrCode = null;
});

// RECEBER MENSAGENS (FILTRADO)
client.on('message', msg => {
    try {
        // ignorar status
        if (msg.from === 'status@broadcast') return;

        // ignorar grupos
        if (msg.from.includes('@g.us')) return;

        console.log(`📩 ${msg.from}: ${msg.body}`);
    } catch (err) {
        console.log('Erro ao ler mensagem:', err.message);
    }
});

// INICIAR CLIENT
client.initialize();

// =======================
// ROTAS
// =======================

// QR
app.get('/qr', (req, res) => {
    if (!qrCode) {
        return res.send('QR ainda não disponível, atualize...');
    }

    res.send(`
        <html>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
                <img src="${qrCode}" />
            </body>
        </html>
    `);
});

// STATUS
app.get('/status', (req, res) => {
    res.json({ connected: isConnected });
});

// ENVIAR (SIMPLES VIA URL)
app.get('/send-simple', async (req, res) => {
    const { number, message } = req.query;

    if (!number || !message) {
        return res.send('Informe number e message na URL');
    }

    try {
        const chatId = number + "@c.us";

        await client.sendMessage(chatId, message);

        res.send('Mensagem enviada com sucesso 🚀');
    } catch (error) {
        res.send('Erro: ' + error.message);
    }
});

// =======================
// START
// =======================
app.listen(3000, () => {
    console.log('🚀 Servidor rodando em http://localhost:3000');
});