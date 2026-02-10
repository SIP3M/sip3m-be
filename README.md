# 🚀 SIP3M Backend (sip3m-be)
**Backend REST API – Sistem Informasi Penelitian, Pengabdian, dan Publikasi Masyarakat**

Repository ini berisi **backend REST API** untuk sistem SIP3M yang dikembangkan menggunakan  
**Node.js (Express) + TypeScript + Prisma ORM**.

Backend ini bertanggung jawab untuk:
- Autentikasi & otorisasi pengguna
- Manajemen user & role (RBAC)
- Profil dosen (dummy)
- Menyediakan API terstruktur untuk frontend SIP3M

---

## 🧠 Gambaran Umum Sistem

Backend SIP3M mengimplementasikan:
- **JWT Authentication**
- **Role-Based Access Control (RBAC)**
- **RESTful API**
- **Input validation**
- **Centralized error handling**
- **Swagger API Documentation**

Role utama:
- `ADMIN_LPPM`
- `STAFF_LPPM`
- `DOSEN`
- `REVIEWER`
- `PIHAK_EKSTERNAL`

---

## 🛠️ Tech Stack

### Core
- Node.js ≥ 20
- TypeScript ≥ 5
- Express.js
- PostgreSQL

### Backend Tools
- Prisma ORM
- JWT (jsonwebtoken)
- Zod (validation)
- Swagger (API Docs)
- bcrypt (password hashing)

---

## 📦 Cara Clone Repository

```bash
git clone https://github.com/<organization>/sip3m-be.git
cd sip3m-be
