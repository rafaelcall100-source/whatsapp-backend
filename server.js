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
// CLIENT WHATSAPP (RAILWAY)
// =======================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
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

// RECEBER MENSAGENS
client.on('message', msg => {
    try {
        if (msg.from === 'status@broadcast') return;
        if (msg.from.includes('@g.us')) return;

        console.log(`📩 ${msg.from}: ${msg.body}`);
    } catch (err) {
        console.log('Erro:', err.message);
    }
});

// INICIAR
client.initialize();

// =======================
// ROTAS
// =======================

// QR (AGORA FUNCIONA ONLINE)
app.get('/qr', (req, res) => {
    if (!qrCode) {
        return res.send('QR ainda não disponível...');
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

// ENVIAR MENSAGEM
app.get('/send-simple', async (req, res) => {
    const { number, message } = req.query;

    if (!number || !message) {
        return res.send('Informe number e message');
    }

    try {
        const chatId = number + "@c.us";
        await client.sendMessage(chatId, message);

        res.send('Mensagem enviada 🚀');
    } catch (error) {
        res.send('Erro: ' + error.message);
    }
});

// =======================
// PORTA DINÂMICA (RAILWAY)
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 Servidor rodando');
});