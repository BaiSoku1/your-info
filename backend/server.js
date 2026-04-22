const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database sederhana untuk menyimpan script
const scriptDatabase = new Map();

// Memastikan folder temp selalu ada
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Fungsi utama untuk menjalankan mesin Prometheus
function obfuscateWithPrometheus(scriptContent) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now();
        const inputPath = path.join(tempDir, `input_${tempId}.lua`);
        const outputPath = path.join(tempDir, `input_${tempId}.obfuscated.lua`);

        // Simpan script dari user ke file sementara
        fs.writeFileSync(inputPath, scriptContent);

        // Cari lokasi mesin Prometheus
        const prometheusPath = path.join(__dirname, '../Prometheus/cli.lua');
        const command = `lua5.3 "${prometheusPath}" --preset Medium "${inputPath}"`;
        
        console.log("Menjalankan command:", command);

        // Eksekusi mesin obfuskator
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("=== ERROR DARI PROMETHEUS ===");
                console.error(error);
                console.error("STDERR:", stderr);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return reject("Gagal mengobfuskasi kode (Cek Log Railway).");
            }
            
            // Jika berhasil, baca file output-nya
            if (fs.existsSync(outputPath)) {
                const obfuscatedCode = fs.readFileSync(outputPath, 'utf8');
                // Hapus file sampah agar server tidak penuh
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

// Endpoint (API) yang dipanggil oleh web frontend Anda
app.post('/api/obfuscate', async (req, res) => {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: "Script kosong!" });

    try {
        console.log("Menerima request obfuscate...");
        const obfuscatedCode = await obfuscateWithPrometheus(script);
        
        // Buat ID unik untuk script ini
        const scriptId = Math.floor(Math.random() * 10000000000000).toString();
        scriptDatabase.set(scriptId, obfuscatedCode);
        
        // Buat format URL loadstring
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const scriptUrl = `${protocol}://${host}/Scripts?Id=${scriptId}`;

        // Loader baru yang menggunakan fungsi request() dan mengirim Header Rahasia
        const loaderScript = `local req = (syn and syn.request) or (http and http.request) or http_request or (fluxus and fluxus.request) or request; if req then local res = req({Url = "${scriptUrl}", Method = "GET", Headers = {["X-Evade-Auth"] = "KunciRahasiaEvade31"}}); if res.StatusCode == 200 then loadstring(res.Body)("${scriptId}") else game.Players.LocalPlayer:Kick("Akses Ditolak: Gagal memuat script.") end else game.Players.LocalPlayer:Kick("Eksekutor kamu tidak mendukung HTTP Requests.") end`;

        res.json({ success: true, loader: loaderScript });
    } catch (error) {
        console.error("=== ERROR UMUM ===");
        console.error(error);
        res.status(500).json({ error: error.toString() });
    }
});

// Endpoint untuk memberikan script saat dijalankan di dalam game Roblox
app.get('/Scripts', (req, res) => {
    const scriptId = req.query.Id;

    // --- SISTEM KEAMANAN ANTI-SKID / ANTI-BROWSER ---
    const authHeader = req.headers['x-evade-auth'];
    const userAgent = req.headers['user-agent'] || '';

    // Deteksi apakah request datang dari browser biasa
    const isBrowser = /Mozilla|Chrome|Safari|Edge|Firefox/i.test(userAgent);

    // Jika header rahasia tidak ada/salah ATAU dibuka lewat browser, TAMPILKAN UI ERROR
    if (authHeader !== 'KunciRahasiaEvade31' || isBrowser) {
        console.log(`[BLOCKED] Percobaan akses skid dari: ${userAgent}`);
        
        // Desain HTML mirip Junkie Developments
        const errorHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Access Denied</title>
            <style>
                body {
                    background-color: #0b0f19;
                    color: #a0aec0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .card {
                    background-color: #111827;
                    border: 1px solid #1f2937;
                    border-radius: 12px;
                    padding: 40px;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                }
                .badge {
                    display: inline-flex;
                    align-items: center;
                    background-color: rgba(220, 38, 38, 0.1);
                    color: #ef4444;
                    border: 1px solid rgba(220, 38, 38, 0.2);
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 24px;
                    letter-spacing: 0.5px;
                }
                .badge-icon {
                    margin-right: 6px;
                    font-size: 14px;
                }
                h1 {
                    color: #ffffff;
                    font-size: 26px;
                    font-weight: 700;
                    margin-top: 0;
                    margin-bottom: 16px;
                }
                p {
                    font-size: 15px;
                    line-height: 1.6;
                    margin-bottom: 16px;
                    color: #9ca3af;
                }
                .button-group {
                    display: flex;
                    gap: 12px;
                    margin-top: 32px;
                }
                .btn {
                    text-decoration: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                .btn-primary {
                    background-color: #3b82f6;
                    color: #ffffff;
                    border: none;
                }
                .btn-primary:hover {
                    background-color: #2563eb;
                }
                .btn-secondary {
                    background-color: transparent;
                    color: #d1d5db;
                    border: 1px solid #374151;
                }
                .btn-secondary:hover {
                    background-color: #1f2937;
                    color: #ffffff;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="badge">
                    <span class="badge-icon">⛔</span> ACCESS DENIED
                </div>
                <h1>This lua script is protected by xyzazen</h1>
                <p>You don't have permission to access these files.</p>
                <p>This script has been protected against unauthorized access, reverse engineering, and tampering.</p>
                <div class="button-group">
                    <a href="https://github.com/xyzazen" class="btn btn-primary">Return Home</a>
                    <a href="https://github.com/xyzazen/remote-loader-project" class="btn btn-secondary">Contact Developer</a>
                </div>
            </div>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        return res.status(403).send(errorHTML);
    }
    // ------------------------------------------------

    // Jika aman (dari eksekutor), kirimkan scriptnya
    const scriptCode = scriptDatabase.get(scriptId);
    
    if (scriptCode) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptCode);
    } else {
        res.status(404).send("-- Script tidak ditemukan / Kadaluarsa");
    }
});

// Menyalakan server (Railway menggunakan port dinamis dari process.env.PORT)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server berjalan mantap di port ${PORT}`);
});