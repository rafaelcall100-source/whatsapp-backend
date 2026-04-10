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
let clientReady = false;

// =======================
// CLIENT WHATSAPP (CLOUD READY)
// =======================
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session' // garante persistência
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
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
    clientReady = true;
    qrCode = null;
});

// DESCONECTOU
client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp desconectado:', reason);
    isConnected = false;
    clientReady = false;

    // tenta reconectar automaticamente
    setTimeout(() => {
        client.initialize();
    }, 5000);
});

// RECEBER MENSAGENS
client.on('message', msg => {
    try {
        if (msg.from === 'status@broadcast') return;
        if (msg.from.includes('@g.us')) return;

        console.log(`📩 ${msg.from}: ${msg.body}`);
    } catch (err) {
        console.log('Erro mensagem:', err.message);
    }
});

// ERRO
client.on('auth_failure', msg => {
    console.log('Erro de autenticação:', msg);
});

// INICIAR
client.initialize();

// =======================
// ROTAS
// =======================

// ROOT (evita erro 502)
app.get('/', (req, res) => {
    res.send('🚀 WhatsApp Backend ONLINE');
});

// QR
app.get('/qr', (req, res) => {
    if (!qrCode) {
        return res.send('⏳ QR ainda não disponível, aguarde...');
    }

    res.send(`
        <html>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;color:#fff;">
                <div style="text-align:center">
                    <h2>Escaneie o QR</h2>
                    <img src="${qrCode}" />
                </div>
            </body>
        </html>
    `);
});

// STATUS
app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        ready: clientReady
    });
});

// ENVIAR MENSAGEM
app.get('/send-simple', async (req, res) => {
    const { number, message } = req.query;

    if (!number || !message) {
        return res.send('Informe number e message');
    }

    if (!clientReady) {
        return res.send('WhatsApp ainda não está pronto');
    }

    try {
        const chatId = number + "@c.us";

        await client.sendMessage(chatId, message);

        res.send('Mensagem enviada 🚀');
    } catch (error) {
        console.log(error);
        res.send('Erro: ' + error.message);
    }
});

// =======================
// PORTA (RAILWAY)
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
});