# 1. Gunakan image Node.js versi 18 (Alpine versi ringan)
FROM node:20-alpine

# 2. Tentukan direktori kerja di dalam container Docker
WORKDIR /app

# 3. Copy package.json dan package-lock.json lebih dulu
COPY package*.json ./

# 4. Install semua dependencies
RUN npm install

# 5. Copy folder prisma dan generate Prisma Client 
# (Ini WAJIB dilakukan di dalam Docker agar menyesuaikan OS Linux Alpine)
COPY prisma ./prisma/
RUN npx prisma generate

# 6. Copy seluruh sisa kode sumber aplikasi (kecuali yang ada di .dockerignore)
COPY . .

# 7. Build kode TypeScript (ts) menjadi JavaScript (js) ke folder dist/
RUN npm run build

# 8. Buka port 3000 agar bisa diakses dari luar container
EXPOSE 3000

# 9. Perintah untuk menjalankan aplikasi saat container hidup
# Pastikan di package.json kamu ada script: "start": "node dist/index.js"
CMD ["npm", "run", "start"]