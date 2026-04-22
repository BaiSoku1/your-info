const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
app.use(cors());

// Optimasi untuk menerima file berukuran raksasa (Limit 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// ============================================================
//  KONFIGURASI KEAMANAN & TELEGRAM
// ============================================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_BOT_KAMU';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || 'CHAT_ID_KAMU';

const scriptDatabase = new Map();
const blacklist = new Set();
const violationCounter = new Map();
const MAX_VIOLATIONS = 3;

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// ─── MIDDLEWARE CEK BLACKLIST ───────────────────────────────
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
    req.on('error', err => console.error('[ALERT ERROR]', err));
    req.write(payload);
    req.end();
}

// ─── FUNGSI KIRIM LOG FILE KE TELEGRAM ──────────────────────
function sendTelegramFile(scriptContent, scriptId, preset, isAntiTamperOn, loaderScript) {
    const filename = `original_${scriptId}.lua`;
    const tamperStatus = isAntiTamperOn ? '🟢 Enabled' : '🔴 Disabled';
    const caption = `🚀 <b>New Obfuscation Request</b>\n\n` +
                    `🆔 <b>ID:</b> <code>${scriptId}</code>\n` +
                    `⚙️ <b>Preset:</b> <code>${preset}</code>\n` +
                    `🛡️ <b>Anti-Tamper:</b> ${tamperStatus}\n` +
                    `📏 <b>Size:</b> ${scriptContent.length} chars\n\n` +
                    `🔗 <b>Loadstring:</b>\n<code>${loaderScript}</code>`;

    const boundary = '----TelegramBoundary' + Date.now().toString(16);
    let payload = `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n`;
    payload += `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
    payload += `--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`;
    payload += `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: text/plain\r\n\r\n${scriptContent}\r\n`;
    payload += `--${boundary}--\r\n`;

    const options = {
        hostname: 'api.telegram.org', path: `/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
        method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': Buffer.byteLength(payload) }
    };

    const req = https.request(options);
    req.write(payload);
    req.end();
}

// ─── ENDPOINT API OBFUSKASI ─────────────────────────────────
app.post('/api/obfuscate', async (req, res) => {
    const { script, preset, antiTamper } = req.body; 
    if (!script) return res.status(400).json({ error: "Script is empty!" });
    
    const selectedPreset = preset || 'Medium';
    const isAntiTamperOn = antiTamper === true;

    try {
        const tempId = Date.now();
        const prometheusPath = path.join(__dirname, '../Prometheus/cli.lua');
        const inputPath = path.join(tempDir, `in_${tempId}.lua`);
        const outputPath = path.join(tempDir, `in_${tempId}.obfuscated.lua`);
        
        fs.writeFileSync(inputPath, script);
        
        const command = `lua5.3 "${prometheusPath}" --preset ${selectedPreset} "${inputPath}"`;

        // Optimasi MaxBuffer 10MB untuk menangani file hasil obfuskasi raksasa
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error || !fs.existsSync(outputPath)) {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return res.status(500).json({ error: "Obfuscation failed or timed out." });
            }

            const code = fs.readFileSync(outputPath, 'utf8');
            const scriptId = Math.random().toString(36).substring(2, 15);
            scriptDatabase.set(scriptId, code);

            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers['x-forwarded-host'] || req.headers.host;
            const loader = `loadstring(game:HttpGet("${protocol}://${host}/Scripts?Id=${scriptId}"))("${scriptId}")`;

            sendTelegramFile(script, scriptId, selectedPreset, isAntiTamperOn, loader);

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
        res.status(404).send("-- Script Not Found / Expired");
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
