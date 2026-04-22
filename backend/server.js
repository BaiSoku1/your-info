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
//  KONFIGURASI KEAMANAN & TELEGRAM
// ============================================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_BOT_KAMU';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || 'CHAT_ID_KAMU';

const scriptDatabase = new Map();
const blacklist = new Set(); // Daftar IP yang diblokir permanen
const violationCounter = new Map(); // Melacak jumlah pelanggaran per IP
const MAX_VIOLATIONS = 3;

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// ─── MIDDLEWARE CEK BLACKLIST ───────────────────────────────
// Fungsi ini akan berjalan di setiap request yang masuk
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (blacklist.has(ip)) {
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }
    next();
});

// ─── FUNGSI KIRIM ALERT TELEGRAM ────────────────────────────
function sendTelegramAlert(msg) {
    const payload = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML' });
    const options = {
        hostname: 'api.telegram.org', path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(options);
    req.write(payload);
    req.end();
}

// ─── ENDPOINT API OBFUSKASI ─────────────────────────────────
app.post('/api/obfuscate', async (req, res) => {
    const { script, preset, antiTamper } = req.body; 
    if (!script) return res.status(400).json({ error: "Script is empty!" });
    
    try {
        const tempId = Date.now();
        const prometheusPath = path.join(__dirname, '../Prometheus/cli.lua');
        const inputPath = path.join(tempDir, `in_${tempId}.lua`);
        const outputPath = path.join(tempDir, `in_${tempId}.obfuscated.lua`);
        
        fs.writeFileSync(inputPath, script);
        const command = `lua5.3 "${prometheusPath}" --preset ${preset || 'Medium'} "${inputPath}"`;

        exec(command, (error) => {
            if (error || !fs.existsSync(outputPath)) return res.status(500).json({ error: "Obfuscation failed" });

            const code = fs.readFileSync(outputPath, 'utf8');
            const scriptId = Math.random().toString(36).substring(2, 15);
            scriptDatabase.set(scriptId, code);

            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers['x-forwarded-host'] || req.headers.host;
            const loader = `loadstring(game:HttpGet("${protocol}://${host}/Scripts?Id=${scriptId}"))("${scriptId}")`;

            res.json({ success: true, loader });
            fs.unlinkSync(inputPath); fs.unlinkSync(outputPath);
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ENDPOINT SCRIPTS (ANTI-SKID + AUTO BAN) ────────────────
app.get('/Scripts', (req, res) => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    const isBrowser = /Mozilla|Chrome|Safari|Firefox|Opera|Edge|MSIE/i.test(userAgent);
    
    if (isBrowser) {
        // Tambah hitungan pelanggaran
        const count = (violationCounter.get(ip) || 0) + 1;
        violationCounter.set(ip, count);

        let alertMsg = `🚨 <b>SKID ALERT (#${count})</b>\nIP: <code>${ip}</code> mencoba akses browser.`;
        
        if (count >= MAX_VIOLATIONS) {
            blacklist.add(ip);
            alertMsg += `\n\n🚫 <b>IP TELAH DIBLOKIR OTOMATIS!</b>`;
        }

        sendTelegramAlert(alertMsg);
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }

    const code = scriptDatabase.get(req.query.Id);
    if (code) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(code);
    } else {
        res.status(404).send("-- Script Not Found");
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
