

```markdown
# RBX.LOADER — Lua Obfuscator & Remote Loader

Proyek ini adalah sistem **Lua Obfuscator** berbasis web yang menggunakan **Prometheus Engine**. Sistem ini memungkinkan pengguna untuk mengunggah script Lua mentah, mengobfuskasinya di server, dan menghasilkan sebuah *loader* (loadstring) yang terlindungi.

## 🚀 Fitur Utama

- **Prometheus Engine:** Menggunakan preset `Medium` untuk perlindungan script.
- **Remote Loading:** Script hasil obfuskasi disimpan di database server (RAM) dan diakses melalui ID unik.
- **Telegram Logging:** Setiap kali ada yang melakukan obfuskasi, file original (.lua) akan otomatis dikirim ke bot Telegram kamu sebagai log/cadangan.
- **Anti-Skid Protection:** Endpoint pengambilan script (`/Scripts`) diproteksi dari akses browser biasa menggunakan pengecekan *User-Agent*.
- **UI Futuristik:** Tampilan web menggunakan tema *cyberpunk/terminal* dengan animasi scanline dan grid.

## 📋 Prasyarat

Sebelum menjalankan proyek ini, pastikan sistem kamu sudah terinstall:
1. **Node.js** (Versi 16 ke atas)
2. **Lua 5.3** (Harus bisa dipanggil via command `lua5.3`)
3. **Prometheus Obfuscator:** Pastikan folder `Prometheus` berada satu tingkat di luar folder proyek ini (`../Prometheus/cli.lua`).

## 🛠️ Instalasi

1. **Clone Repositori:**
   ```bash
   git clone [https://github.com/xyzazen/remote-loader-project.git](https://github.com/xyzazen/remote-loader-project.git)
   cd remote-loader-project
   ```

2. **Install Dependensi:**
   ```bash
   npm install
   ```

3. **Setup Folder Temp:**
   Pastikan folder `temp` ada untuk proses pemrosesan file sementara (otomatis dibuat oleh server jika belum ada).

## ⚙️ Konfigurasi (Environment Variables)

Sangat disarankan untuk menggunakan variabel lingkungan (*Environment Variables*) agar token bot kamu tetap aman. Jika menggunakan Railway, tambahkan di bagian **Variables**:

| Variabel | Deskripsi |
| :--- | :--- |
| `PORT` | Port server (default: 8080) |
| `TELEGRAM_BOT_TOKEN` | Token dari @BotFather |
| `TELEGRAM_CHAT_ID` | Chat ID kamu (bisa didapat dari @userinfobot) |

## 🖥️ Cara Menjalankan

### Mode Pengembangan
```bash
node server.js
```

### Mode Produksi (Railway/VPS)
Server akan otomatis mendeteksi port dari sistem dan menjalankan:
```bash
npm start
```

## 📂 Struktur Proyek

```text
├── public/
│   ├── index.html    # UI Utama (Frontend)
│   └── 403.html      # Halaman blokir untuk browser (Anti-Skid)
├── temp/             # Folder temporary untuk proses obfuskasi
├── server.js         # Backend Node.js (Express + Telegram Logic)
├── package.json      # Dependensi proyek
└── README.md         # Dokumentasi (File ini)
```

## 🔒 Keamanan (Anti-Browser)

Sistem ini memiliki proteksi pada endpoint `/Scripts`. Jika seseorang mencoba membuka link loader di browser (Chrome, Firefox, dll), server akan mendeteksi *User-Agent* mereka dan memberikan respon **403 Forbidden**. Script hanya bisa ditarik melalui `game:HttpGet` atau library HTTP di dalam lingkungan eksekusi Lua/Roblox.

---
**Dibuat oleh [xyzazen](https://github.com/xyzazen)**
```

### Tips Tambahan untuk Kamu:
1. **Prometheus Path:** Di `server.js`, perintahnya adalah `../Prometheus/cli.lua`. Pastikan struktur folder di server (Railway/VPS) kamu sudah sesuai, atau ubah *path* tersebut jika kamu menaruh folder Prometheus di dalam folder proyek.
2. **Token Keamanan:** Jangan pernah menulis token asli langsung di kode `server.js` jika ingin di-upload ke GitHub publik. Selalu gunakan `process.env`.

Apakah ada bagian lain yang ingin kamu tambahkan di README-nya?
