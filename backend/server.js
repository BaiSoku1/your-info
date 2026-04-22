const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const scriptDatabase = new Map();
const tempDir = path.join(__dirname, 'temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

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

        res.json({ success: true, loader: loaderScript });
    } catch (error) {
        console.error("=== ERROR UMUM ===");
        console.error(error);
        res.status(500).json({ error: error.toString() });
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
