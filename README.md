# SIP3M Backend – Express.js API

Backend API untuk sistem **SIP3M** yang menangani proses autentikasi, manajemen data, dan layanan inti aplikasi.  
Dibangun menggunakan **Node.js + Express.js** dan terhubung ke database.

---

## 🚀 Teknologi yang Digunakan
- Node.js
- Express.js
- TypeScript
- Database (sesuai konfigurasi)
- ORM / Query Builder (jika ada)
- JWT Authentication

---

## 📂 Struktur Project (Ringkas)

sip3m-be-express/
├── src/
│ ├── controllers/
│ ├── routes/
│ ├── middlewares/
│ ├── services/
│ ├── utils/
│ └── index.ts
├── prisma/ (jika pakai Prisma)
├── .env.example
├── tsconfig.json
└── package.json


---

## 🔐 Fitur yang Sudah Dibuat

### 1️⃣ Autentikasi & Otorisasi
- Login user
- Logout user
- JWT-based authentication
- Role-based access control (RBAC)

**Role yang tersedia:**
- Admin
- Petugas
- Manajemen

---

### 2️⃣ Manajemen User
- Tambah user
- Lihat daftar user
- Update data user
- Hapus user

---

### 3️⃣ (Tambahkan fitur sesuai project kamu)
Contoh:
- Manajemen data parkir
- Manajemen kendaraan masuk & keluar
- Laporan data
- Dashboard statistik

> 📌 **Catatan QA:**  
> Semua endpoint yang dilindungi membutuhkan **Bearer Token**.

---

## 🌐 Dokumentasi Endpoint (Contoh)

### 🔑 Auth
| Method | Endpoint | Deskripsi |
|------|---------|----------|
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |

---

### 👤 User
| Method | Endpoint | Deskripsi |
|------|---------|----------|
| GET | `/api/users` | Ambil semua user |
| POST | `/api/users` | Tambah user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Hapus user |

---

## 🧪 Cara QA Melakukan Testing

### 1️⃣ Clone Repository
```bash
git clone https://github.com/SIP3M/sip3m-be.git
cd sip3m-be-express

### 2 Install Dependencies
npm install

### 3 Konfigurasi Environment
minta ke Backend