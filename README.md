# 🚀 SIP3M Backend (sip3m-be)

**Backend REST API – Sistem Informasi Penelitian, Pengabdian, dan Publikasi Masyarakat**

Repository ini berisi **backend REST API** untuk sistem SIP3M yang dikembangkan menggunakan  
**Node.js (Express) + TypeScript + Prisma ORM**.

---

## 📖 Daftar Isi

- [Gambaran Umum](#-gambaran-umum-sistem)
- [Tech Stack](#️-tech-stack)
- [Cara Menjalankan Server](#-cara-menjalankan-server)
- [Akun Dummy untuk Testing](#-akun-dummy-untuk-testing)
- [Swagger API Docs](#-swagger-api-docs-cara-termudah)
- [Testing dengan Postman](#-testing-dengan-postman)
- [Daftar Semua Endpoint](#-daftar-semua-endpoint)
- [Panduan Testing Per Fitur](#-panduan-testing-per-fitur)
- [Troubleshooting](#-troubleshooting)

---

## 🧠 Gambaran Umum Sistem

Backend SIP3M mengimplementasikan:

- **JWT Authentication** — Login menghasilkan token, token dipakai untuk akses API
- **Role-Based Access Control (RBAC)** — Setiap endpoint hanya bisa diakses oleh role tertentu
- **RESTful API** — Semua komunikasi lewat HTTP JSON
- **Input validation** — Data dicek sebelum diproses
- **Swagger API Documentation** — Dokumentasi interaktif yang bisa dicoba langsung

### Role yang tersedia:

| Role                 | Deskripsi                      |
| -------------------- | ------------------------------ |
| `ADMIN_LPPM`         | Admin utama, kelola semua user |
| `STAFF_LPPM`         | Staff LPPM                     |
| `DOSEN`              | Dosen pengusul proposal        |
| `REVIEWER`           | Reviewer internal              |
| `REVIEWER_EKSTERNAL` | Reviewer dari luar             |

---

## 🛠️ Tech Stack

| Kategori       | Teknologi                            |
| -------------- | ------------------------------------ |
| Runtime        | Node.js ≥ 20                         |
| Language       | TypeScript ≥ 5                       |
| Framework      | Express.js 5                         |
| Database       | PostgreSQL (Supabase)                |
| ORM            | Prisma                               |
| Authentication | JWT (jsonwebtoken)                   |
| Validation     | Zod                                  |
| API Docs       | Swagger (swagger-jsdoc + swagger-ui) |
| File Storage   | Supabase Storage                     |
| Password       | bcrypt                               |

---

## 🖥️ Cara Menjalankan Server

### Opsi 1: Tanpa Docker (Development)

```bash
# 1. Clone repo
git clone https://github.com/<organization>/sip3m-be.git
cd sip3m-be

# 2. Install dependencies
npm install

# 3. Buat file .env (minta ke developer, contoh isinya di bawah)

# 4. Generate Prisma Client
npx prisma generate

# 5. Jalankan server
npm run dev
```

Server akan berjalan di `http://localhost:3000`

### Opsi 2: Dengan Docker

```bash
# 1. Build image
docker build -t sip3m-backend .

# 2. Jalankan container
docker run -p 3000:3000 --env-file .env sip3m-backend
```

### Contoh isi file `.env`

> ⚠️ Minta file `.env` yang sebenarnya ke developer. Jangan buat sendiri.

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
DIRECT_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-jwt-secret
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-supabase-key
PORT=3000
```

### Cek server sudah jalan

Buka browser atau Postman, akses:

```
GET http://localhost:3000/health
```

Jika berhasil, responsenya:

```json
{ "status": "ok" }
```

---

## 👤 Akun Dummy untuk Testing

Akun-akun ini sudah di-seed ke database. Password semua akun sama.

| Role       | Email                   | Password      |
| ---------- | ----------------------- | ------------- |
| Admin LPPM | `admin@lppm.ac.id`      | `password123` |
| Staff LPPM | `staff@lppm.ac.id`      | `password123` |
| Dosen      | `dosen@kampus.ac.id`    | `password123` |
| Reviewer   | `reviewer@kampus.ac.id` | `password123` |

> 💡 Gunakan **email** sebagai `identifier` saat login.

---

## 📘 Swagger API Docs (Cara Termudah!)

Swagger adalah cara **paling mudah** untuk melihat dan mencoba semua API **tanpa Postman**.

### Cara akses:

1. Pastikan server sudah berjalan
2. Buka browser ke: **http://localhost:3000/docs**
3. Kamu akan melihat halaman interaktif dengan semua endpoint

### Cara pakai Swagger:

1. **Login dulu** — Klik endpoint `POST /auth/login`, klik **Try it out**, isi body, klik **Execute**
2. **Copy token** — Dari response, copy nilai `token`
3. **Authorize** — Klik tombol 🔒 **Authorize** di pojok kanan atas, paste token, klik **Authorize**
4. **Coba endpoint lain** — Semua endpoint sekarang akan otomatis pakai token kamu

> 🔗 Jika server di-deploy, gunakan URL production: `https://sip3m-be.vercel.app/docs`

---

## 🧪 Testing dengan Postman

### Langkah 1: Login dan Dapatkan Token

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "identifier": "admin@lppm.ac.id",
  "password": "password123"
}
```

Response sukses:

```json
{
  "message": "Login berhasil.",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Copy nilai `token`.**

### Langkah 2: Pakai Token di Semua Request Selanjutnya

Di Postman, untuk setiap request yang butuh login:

1. Buka tab **Authorization**
2. Pilih type: **Bearer Token**
3. Paste token yang tadi di-copy

Atau secara manual, tambahkan header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Langkah 3: Test Endpoint

Sekarang kamu bisa test semua endpoint. Lihat daftar lengkapnya di bawah.

---

## 📋 Daftar Semua Endpoint

> Base URL: `http://localhost:3000/api`

### 🔐 Auth (Publik — Tanpa Login)

| Method | Endpoint                  | Deskripsi                     |
| ------ | ------------------------- | ----------------------------- |
| POST   | `/auth/register/dosen`    | Registrasi akun dosen         |
| POST   | `/auth/register/reviewer` | Registrasi reviewer eksternal |
| POST   | `/auth/login`             | Login (dapat token)           |

### 🔐 Auth (Butuh Login)

| Method | Endpoint   | Deskripsi                  | Role       |
| ------ | ---------- | -------------------------- | ---------- |
| GET    | `/auth/me` | Lihat info user yang login | Semua role |

### 👥 Users (Butuh Login — ADMIN_LPPM only)

| Method | Endpoint            | Deskripsi                 |
| ------ | ------------------- | ------------------------- |
| GET    | `/users`            | Lihat semua user          |
| GET    | `/users/:id`        | Lihat user berdasarkan ID |
| POST   | `/users`            | Buat user baru            |
| PUT    | `/users/:id`        | Update user               |
| PATCH  | `/users/:id/role`   | Ubah role user            |
| PATCH  | `/users/:id/status` | Aktifkan/nonaktifkan user |
| DELETE | `/users/:id`        | Hapus user                |

### 🎓 Dosen (Butuh Login — DOSEN only)

| Method | Endpoint         | Deskripsi           |
| ------ | ---------------- | ------------------- |
| GET    | `/dosen/profile` | Lihat profil dosen  |
| PATCH  | `/dosen/profile` | Update profil dosen |

### 📄 Proposal (Butuh Login)

| Method | Endpoint           | Deskripsi               | Role yang boleh akses                                |
| ------ | ------------------ | ----------------------- | ---------------------------------------------------- |
| POST   | `/proposals`       | Buat proposal baru      | DOSEN                                                |
| GET    | `/getAllProposals` | Lihat semua proposal    | ADMIN_LPPM, STAFF_LPPM, REVIEWER, REVIEWER_EKSTERNAL |
| GET    | `/proposals/:id`   | Lihat detail 1 proposal | ADMIN_LPPM, STAFF_LPPM, REVIEWER                     |

---

## 🔍 Panduan Testing Per Fitur

### 1. Test Registrasi Dosen

```
POST http://localhost:3000/api/auth/register/dosen
Content-Type: application/json

{
  "name": "Test Dosen QA",
  "tempat_lahir": "Jakarta",
  "tanggal_lahir": "1990-01-15",
  "jenis_kelamin": "Laki-laki",
  "nomor_hp": "081234567890",
  "email": "testqa@kampus.ac.id",
  "nidn": "9999999999",
  "fakultas": "Teknik",
  "program_studi": "Teknik Informatika",
  "username": "testqa_dosen",
  "password": "password123",
  "konfirmasi_password": "password123"
}
```

✅ **Expected:** Status `201`, pesan registrasi berhasil, `is_active: false`  
❌ **Cek error:** Coba kirim email/nidn/username yang sudah ada → harusnya `409`

---

### 2. Test Login

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "identifier": "admin@lppm.ac.id",
  "password": "password123"
}
```

✅ **Expected:** Status `200`, dapat `token`  
❌ **Cek error:** Password salah → `401`; Akun non-aktif → `403`

---

### 3. Test Lihat Info User yang Login

```
GET http://localhost:3000/api/auth/me
Authorization: Bearer <token_dari_login>
```

✅ **Expected:** Status `200`, data user yang sedang login

---

### 4. Test CRUD User (Login sebagai Admin)

**Lihat semua user:**

```
GET http://localhost:3000/api/users
Authorization: Bearer <token_admin>
```

**Aktifkan user (contoh: user ID 5):**

```
PATCH http://localhost:3000/api/users/5/status
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "is_active": true
}
```

✅ **Expected:** User berhasil diupdate  
❌ **Cek error:** Login sebagai DOSEN, coba akses → harusnya `403 Forbidden`

---

### 5. Test Buat Proposal (Login sebagai Dosen)

> ⚠️ Endpoint ini pakai **form-data** (bukan JSON), karena ada upload file.

Di Postman:

1. Method: `POST`
2. URL: `http://localhost:3000/api/proposals`
3. Tab **Authorization**: Bearer Token → paste token dosen
4. Tab **Body** → pilih **form-data**
5. Isi field-field berikut:

| Key                      | Type | Value                           |
| ------------------------ | ---- | ------------------------------- |
| `title`                  | Text | `Penelitian AI untuk Pertanian` |
| `faculty`                | Text | `Teknik`                        |
| `skema`                  | Text | `Penelitian Dasar`              |
| `funding_request_amount` | Text | `15000000`                      |
| `is_draft`               | Text | `false`                         |
| `proposal_file`          | File | _(pilih file PDF)_              |
| `rab_file`               | File | _(pilih file PDF)_              |

✅ **Expected:** Status `201`, proposal berhasil dikirim  
💡 **Test draft:** Set `is_draft` ke `true`, file boleh kosong → harusnya berhasil simpan draf  
❌ **Cek error:** `is_draft: false` tanpa file → harusnya `400`

---

### 6. Test Lihat Semua Proposal (Login sebagai Admin/Staff/Reviewer)

```
GET http://localhost:3000/api/getAllProposals
Authorization: Bearer <token_admin>
```

✅ **Expected:** Status `200`, array berisi semua proposal  
❌ **Cek error:** Login sebagai DOSEN, coba akses → harusnya `403`

---

### 7. Test Lihat Proposal by ID

```
GET http://localhost:3000/api/proposals/1
Authorization: Bearer <token_admin>
```

✅ **Expected:** Status `200`, detail 1 proposal  
❌ **Cek error:** ID tidak ada → `404`; ID bukan angka → `400`

---

## ❗ Troubleshooting

| Masalah                                  | Solusi                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `Cannot connect to server`               | Pastikan server sudah jalan (`npm run dev`). Cek port 3000 tidak dipakai.       |
| `401 Unauthorized`                       | Token belum ditambahkan atau sudah expired. Login ulang untuk dapat token baru. |
| `403 Forbidden`                          | Role kamu tidak punya akses ke endpoint ini. Cek tabel di atas.                 |
| `404 Not Found`                          | URL salah. Pastikan ada prefix `/api/` di depan endpoint.                       |
| `500 Internal Server Error`              | Ada masalah di server. Cek terminal/log server, laporkan ke developer.          |
| Response body kosong / array kosong `[]` | Data memang belum ada. Buat dulu (misal: buat proposal dulu baru bisa GET).     |
| `ECONNREFUSED`                           | Server belum jalan. Jalankan `npm run dev` dulu.                                |
| Login gagal padahal password benar       | Cek apakah akun `is_active: true`. Minta admin untuk mengaktifkan.              |

---

## 📝 Catatan Penting untuk QA

1. **Selalu login dulu** sebelum test endpoint yang butuh autentikasi
2. **Gunakan akun yang sesuai rolenya** — Misal: test proposal → login sebagai Dosen; test lihat semua proposal → login sebagai Admin
3. **Perhatikan method HTTP** — `GET`, `POST`, `PUT`, `PATCH`, `DELETE` harus tepat
4. **Perhatikan Content-Type** — Kebanyakan pakai `application/json`, kecuali upload file pakai `form-data`
5. **Cek response status code** — Bukan hanya body, tapi juga kode status (200, 201, 400, 401, 403, 404, 500)
6. **Test juga skenario negatif** — Input salah, tanpa token, role yang tidak sesuai, dll.
7. **Swagger** (`/docs`) sangat membantu untuk lihat semua endpoint dan mencobanya langsung tanpa Postman
