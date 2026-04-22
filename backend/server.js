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

// ─── ENDPOINT SCRIPTS (ANTI-SKID DENGAN TELEGRAM ALERT) ─────
app.get('/Scripts', (req, res) => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // Deteksi jika request datang dari browser biasa
    const isBrowser = /Mozilla|Chrome|Safari|Firefox|Opera|Edge|MSIE/i.test(userAgent);
    
    if (isBrowser) {
        // Ambil IP Address (mendukung format dari proxy/Railway)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
        
        // Buat pesan peringatan untuk Telegram
        const alertMsg = `🚨 <b>SKID ALERT: Akses Ilegal Terdeteksi!</b>\n\n` +
                         `⚠️ Seseorang mencoba mengakses endpoint /Scripts lewat browser.\n\n` +
                         `🌐 <b>IP Address:</b> <code>${ip}</code>\n` +
                         `💻 <b>User-Agent:</b> <code>${userAgent}</code>\n` +
                         `📅 <b>Waktu:</b> ${new Date().toLocaleString('id-ID')} WIB`;

        // Kirim alert menggunakan fungsi sendTelegram biasa
        const payload = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: alertMsg,
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

        const alertReq = https.request(options, (alertRes) => {
            alertRes.on('data', () => {}); // Abaikan respon agar tidak menumpuk di log console
        });
        alertReq.on('error', err => console.error('[TELEGRAM ALERT ERROR]', err));
        alertReq.write(payload);
        alertReq.end();

        // Tetap tampilkan halaman 403 ke si Skid
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }

    // Jika bukan browser (asumsi dari Roblox/Executor), lanjutkan ambil script
    const scriptId   = req.query.Id;
    const scriptCode = scriptDatabase.get(scriptId);

    if (scriptCode) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptCode);
    } else {
        res.status(404).send("-- Script Expired / Not Found");
    }
});
