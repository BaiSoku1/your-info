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
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TOKEN_LU_DI_SINI';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || 'CHAT_ID_LU_DI_SINI';

const scriptDatabase = new Map();
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// ─── FUNGSI KIRIM FILE KE TELEGRAM ──────────────────────────
function sendTelegramFile(scriptContent, scriptId, preset, isAntiTamperOn, loaderScript) {
    const filename = `original_${scriptId}.lua`;
    
    // Status Anti-Tamper dirapikan ke dalam caption
    const tamperStatus = isAntiTamperOn ? '🟢 Enabled' : '🔴 Disabled';
    const caption = `🚀 <b>New Obfuscation Request</b>\n\n` +
                    `🆔 <b>ID:</b> <code>${scriptId}</code>\n` +
                    `⚙️ <b>Preset:</b> <code>${preset}</code>\n` +
                    `🛡️ <b>Anti-Tamper:</b> ${tamperStatus}\n` +
                    `📏 <b>Size:</b> ${scriptContent.length} chars\n` +
                    `📅 <b>Date:</b> ${new Date().toLocaleString('id-ID')} WIB\n\n` +
                    `🔗 <b>Loadstring (Tap to Copy):</b>\n` +
                    `<code>${loaderScript}</code>`;

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
        res.on('end', () => console.log('[TELEGRAM LOG] Berhasil dikirim'));
    });
    req.on('error', err => console.error('[TELEGRAM ERROR]', err));
    req.write(payload);
    req.end();
}

// ─── FUNGSI CORE OBFUSKASI ──────────────────────────────────
function obfuscateWithPrometheus(scriptContent, preset, antiTamper) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now();
        const inputPath  = path.join(tempDir, `in_${tempId}.lua`);
        const outputPath = path.join(tempDir, `in_${tempId}.obfuscated.lua`);

        fs.writeFileSync(inputPath, scriptContent);

        const prometheusPath = path.join(__dirname, '../Prometheus/cli.lua');
        
        // Menyiapkan command dasar
        let command = `lua5.3 "${prometheusPath}" --preset ${preset} "${inputPath}"`;
        
        // Catatan: Jika versi CLI Prometheus kamu mendukung flag tambahan untuk steps,
        // kamu bisa menambahkannya di sini. Jika tidak, preset di cli.lua yang akan memutuskannya.
        if (antiTamper) {
            console.log("[INFO] Eksekusi dengan Anti-Tamper diaktifkan.");
            // command += ` --AntiTamper`; // Uncomment baris ini JIKA CLI Prometheus-mu mendukung flag tersebut
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Exec Error:", stderr);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return reject(`Gagal memproses dengan preset ${preset}.`);
            }

            if (fs.existsSync(outputPath)) {
                const obfuscatedCode = fs.readFileSync(outputPath, 'utf8');
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(obfuscatedCode);
            } else {
                reject("Output file tidak tergenerate.");
            }
        });
    });
}

// ─── ENDPOINT API ───────────────────────────────────────────
app.post('/api/obfuscate', async (req, res) => {
    // Sekarang menerima nilai antiTamper dari frontend
    const { script, preset, antiTamper } = req.body; 
    
    if (!script) return res.status(400).json({ error: "Script is empty!" });
    
    const selectedPreset = preset || 'Medium';
    const isAntiTamperOn = antiTamper === true;

    try {
        const obfuscatedCode = await obfuscateWithPrometheus(script, selectedPreset, isAntiTamperOn);
        
        const scriptId = Math.random().toString(36).substring(2, 15);
        scriptDatabase.set(scriptId, obfuscatedCode);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const loader = `loadstring(game:HttpGet("${protocol}://${host}/Scripts?Id=${scriptId}"))("${scriptId}")`;

        // Kirim ke Telegram beserta status Anti-Tamper
        sendTelegramFile(script, scriptId, selectedPreset, isAntiTamperOn, loader);

        res.json({ success: true, loader });
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

app.get('/Scripts', (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    if (/Mozilla|Chrome|Safari|Firefox/i.test(userAgent)) {
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }
    const code = scriptDatabase.get(req.query.Id);
    if (code) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(code);
    } else {
        res.status(404).send("-- Script Expired");
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
