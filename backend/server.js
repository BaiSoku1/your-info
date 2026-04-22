const express = require('express');
const cors = require('cors'); // Tambahan baru
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors()); // Tambahan baru
app.use(express.json())

// Ini yang membuat frontend (HTML) langsung bisa diakses!
app.use(express.static('public'));

const scriptDatabase = new Map();
const tempDir = path.join(__dirname, 'temp');

// --- TAMBAHKAN 3 BARIS INI ---
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}
// -----------------------------

function obfuscateWithPrometheus(scriptContent) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now();
        const inputPath = path.join(tempDir, `input_${tempId}.lua`);
        const outputPath = path.join(tempDir, `input_${tempId}.obfuscated.lua`);

        fs.writeFileSync(inputPath, scriptContent);

        // Path ke mesin Prometheus
        const prometheusPath = path.join(__dirname, '../Prometheus/cli.lua');
        // Gunakan lua5.3 sesuai yang kita install di Codespaces
        const command = `lua5.3 "${prometheusPath}" --preset Medium "${inputPath}"`;
        
        exec(command, (error) => {
            if (error) {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return reject("Gagal mengobfuskasi kode.");
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

app.post('/api/obfuscate', async (req, res) => {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: "Script kosong!" });

    try {
        const obfuscatedCode = await obfuscateWithPrometheus(script);
        const scriptId = Math.floor(Math.random() * 10000000000000).toString();
        scriptDatabase.set(scriptId, obfuscatedCode);
        
        // Di Codespaces, kita bisa memaksa menggunakan header X-Forwarded-Host jika tersedia
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const loaderScript = `loadstring(game:HttpGet("${protocol}://${host}/Scripts?Id=${scriptId}"))("${scriptId}")`;

        res.json({ success: true, loader: loaderScript });
    } catch (error) {
        res.status(500).json({ error: "Terjadi kesalahan server." });
    }
});

app.get('/Scripts', (req, res) => {
    const scriptId = req.query.Id;
    const scriptCode = scriptDatabase.get(scriptId);
    if (scriptCode) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptCode);
    } else {
        res.status(404).send("-- Script tidak ditemukan");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});