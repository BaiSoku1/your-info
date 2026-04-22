# Gunakan OS Linux dengan Node.js 18
FROM node:18

# Update OS dan install Lua 5.3
RUN apt-get update && apt-get install -y lua5.3

# Buat folder kerja di server
WORKDIR /app

# Pindahkan semua file kita ke server
COPY . .

# Masuk ke folder backend dan install library Node.js
WORKDIR /app/backend
RUN npm install

# Buka port 3000 dan jalankan servernya
EXPOSE 3000
CMD ["node", "server.js"]