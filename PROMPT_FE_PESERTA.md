# PROMPT FE — Peserta KKM (Manajemen Peserta & Verifikasi)

> Copy-paste prompt di bawah ke AI FE (Cursor / Claude / Codex / Gemini). Sudah disesuaikan dengan BE yang baru jadi di branch `peserta-kkm`.

---

## PROMPT UNTUK AI FE

Kamu adalah Frontend Engineer untuk SIP3M (Sistem Informasi LPPM).

### Konteks BE

- Module **Peserta KKM** sudah jadi di BE (branch `peserta-kkm`, turunan `kkm-dpl -> location-kkm -> periode-kkm`).
- Prinsip data: **Peserta = user role MAHASISWA** (`users.semester Int?`, `users.nidn_nip = NIM`, `users.Fakultas/ProgramStudi`). Peserta didaftarkan ke **periode** via `KkmPeserta { periode_id, user_id @unique([periode_id,user_id]), kelompok_id? -> KkmKelompok, status: PENDING|VERIFIED|REJECTED }`. `kelompok_id=null` = **Belum Ditempatkan** (derived, bukan kolom). Status kelompok & 5 statistik semua derived.
- **20 dummy MAHASISWA** sudah ada: `210411001..020@student.umc.ac.id` / `Mahasiswa123!` (bcrypt), sebar 4 Fakultas/Prodi, `semester 5-8`. **Tidak ada yang assign kelompok** (semua `kelompok_id=null`) — untuk testing manual Assign Kelompok. 10 di antaranya sudah jadi `KkmPeserta` di periode terbaru (`id 2 KKM Periode 2040`): **5 VERIFIED / 4 PENDING / 1 REJECTED**, semua **Belum Ditempatkan** (angka `10/5/4/1/10` di SEED; screenshot contoh `10/5/4/1/1` — FE pakai `stats` real, jangan hardcode).
- **Import Mahasiswa (Excel) TIDAK JADI** — abaikan tombol `Import Mahasiswa` di screenshot. FE jangan bikin.
- Base URL: `http://localhost:3000/api` (prod: `https://sip3m-be.vercel.app/api`)
- Auth: `Authorization: Bearer <JWT>` (login sebagai ADMIN_LPPM untuk verifikasi/assign; dummy mahasiswa bisa `POST /auth/login`)
- Swagger lengkap ada di `GET /docs` tag **KKM Peserta**, schema `KkmPeserta`.
- RBAC: `GET /kkm/peserta`, `GET /kkm/peserta/stats`, `GET /kkm/peserta/export`, `GET /kkm/peserta/:id` = `ADMIN_LPPM + STAFF_LPPM`. `PATCH /kkm/peserta/bulk-status`, `POST /kkm/peserta/assign-kelompok`, `PATCH /kkm/peserta/:id/status` = `ADMIN_LPPM` only.

### UI Target (screenshot yang kamu lihat)

Bikin 1 halaman penuh `Peserta KKM` (`/kkm/peserta`) dari atas ke bawah:

**1. Header**
- Judul `Peserta KKM` + subtitle mis. `Kelola peserta KKM per periode`. Di kanan: tombol `Export Data` (merah outline) + abaikan `Import Mahasiswa` (jangan render).

**2. 5 Kartu Statistik** (di atas filter, 1 baris 5 kolom, dari `GET /kkm/peserta/stats?periode_id=2`, jangan hardcode):
- `TOTAL` = `total` (semua peserta di periode)
- `VERIFIED` = `verified` (hijau)
- `PENDING` = `pending` (kuning/orange)
- `REJECTED` = `rejected` (merah)
- `BELUM KELOMPOK` = `belum_kelompok` (abu/biru, `COUNT where kelompok_id is null`)
- Contoh seed: `10 / 5 / 4 / 1 / 10`. Screenshot contoh `10/5/4/1/1` hanya dummy — FE tampilkan angka real dari API.

**3. Filter Bar** (di atas tabel, 1 baris wrap):
- Dropdown **Periode** wajib — default = `GET /kkm/periods/active` (atau periode terbaru `GET /kkm/periods`). Tanpa `periode_id`, tabel kosong + hint "Pilih periode dulu". Semua request peserta kirim `periode_id`.
- Dropdown **Fakultas** (query `fakultas`, contains, mis. `Teknik`, `Ekonomi`). Isi dari `GET /master/fakultas` atau bebas ketik.
- Dropdown **Prodi** (query `prodi`, contains, mis. `Informatika`, `Manajemen`).
- Dropdown **Semester** (query `semester`, number 1-14, mis. `7`).
- Dropdown **Kelompok** (query `kelompok_id`, number; isi dari `GET /kkm/dpl/kelompok?periode_id=2` — list `Kelompok 01 Astanajapura ...`).
- Tombol `Reset` (clear semua filter kecuali periode).

**4. Tabs + Search** (di bawah kartu, di atas tabel):
- Input `Search` placeholder `Cari NIM, nama, prodi, kelompok...` (query `search` — BE cari di `users.name / nidn_nip / ProgramStudi.nama / KkmKelompok.nama / KkmLocation.desa`)
- Tabs 5: `Semua` (tanpa query status) | `Pending` (`status=PENDING`) | `Verified` (`status=VERIFIED`) | `Rejected` (`status=REJECTED`) | `Belum Kelompok` (`status_kelompok=BelumDitempatkan`). Count di tab ambil dari `stats` (bukan dari `meta` tabel). Klik tab = set query & reload `GET /kkm/peserta`.

**5. Tabel 7 kolom** (dari `GET /kkm/peserta?periode_id&page&search&fakultas&prodi&semester&kelompok_id&status&status_kelompok`, 10/halaman):
| Checkbox | NIM (`nidn_nip` kecil monospace) | NAMA (bold) + PRODI/FAKULTAS kecil di bawahnya (`S1 Teknik Informatika — Fakultas Teknik`) | SEMESTER (`SEM. 7` badge abu) | STATUS VERIFIKASI (badge: hijau `Verified` / kuning `Pending` / merah `Rejected`) | STATUS KELOMPOK (badge: abu `Belum Ditempatkan` atau hijau `Kelompok 07 Astanajapura` = `kelompok.nama + desa`) | AKSI (ikon: mata = detail `GET /:id`, centang hijau = `PATCH /:id/status VERIFIED`, silang merah = `PATCH /:id/status REJECTED`) |
- `STATUS KELOMPOK` = `status_kelompok` dari BE (derived `kelompok_id==null`). Jika `kelompok` ada, tampilkan `nama + desa` (mis. `Kelompok 07 Astanajapura`), jika null tampilkan `Belum Ditempatkan` badge abu.
- Checkbox di header = select all di halaman. Pilih baris = muncul **Bulk Bar** di bawah tabel.
- Empty state: "Belum ada peserta di periode ini" jika 0.

**6. Bulk Bar** (muncul jika >=1 checkbox terpilih, sticky bawah tabel):
- Text: `3 peserta dipilih`
- Tombol: `Verifikasi Massal` (hijau, `PATCH /kkm/peserta/bulk-status { periode_id, peserta_ids, status:"VERIFIED" }`), `Reject` (merah, `status:"REJECTED"`), `Assign Kelompok` (biru, buka modal), `Export Data` (outline, `GET /kkm/peserta/export` dengan filter aktif).
- Setelah bulk sukses, reload `stats` + `list`.

**7. Pagination** bawah tabel: `Menampilkan 10 dari 10 peserta` + `Sebelumnya | 1 | Selanjutnya`, pakai `meta { totalData, totalPages, currentPage, limit }`.

**8. Modal `Assign Kelompok`** (dipakai bulk bar & bisa per row):
- Dropdown **Kelompok** — list dari `GET /kkm/dpl/kelompok?periode_id=2&search=` (atau `GET /kkm/locations?periode_id=2` → kelompok). Tiap row: `Kelompok 07` bold + `Astanajapura (Kec. Plumbon) — Kuota 12 / Terisi 0` kecil.
- Validasi: `kelompok.periode_id` harus sama dengan `peserta.periode_id` (BE 400 jika beda), `countInKelompok + dipilih.length <= kuota` (BE 400 jika penuh).
- Submit: `POST /kkm/peserta/assign-kelompok { peserta_ids: number[], kelompok_id: number }`.
- Loading & toast sukses/gagal.

### API Lengkap (prefix `/api`)

```
GET  /kkm/peserta/stats?periode_id=2
GET  /kkm/peserta?periode_id=2&page=1&search=Andi&fakultas=Teknik&prodi=Informatika&semester=7&kelompok_id=7&status=VERIFIED&status_kelompok=BelumDitempatkan
GET  /kkm/peserta/export?periode_id=2&status=VERIFIED&status_kelompok=BelumDitempatkan&semester=7
GET  /kkm/peserta/:id
PATCH /kkm/peserta/:id/status         { status: "VERIFIED" | "PENDING" | "REJECTED" }
PATCH /kkm/peserta/bulk-status        { periode_id, peserta_ids: [1,2,3], status }
POST  /kkm/peserta/assign-kelompok    { peserta_ids: [1,2], kelompok_id: 7 }
# Helpers untuk dropdown:
GET  /kkm/periods/active              -> periode default
GET  /kkm/dpl/kelompok?periode_id=2&unassigned_only=false&search=Astanajapura
GET  /kkm/locations?periode_id=2      -> lihat lokasi/desa/kuota per kelompok
```

**Example GET /kkm/peserta/stats?periode_id=2:**
```json
{
  "message": "Berhasil mengambil statistik peserta KKM.",
  "data": { "periode": { "id": 2, "nama_periode": "KKM Periode 2040", "tahun_akademik": "2025/2026" }, "total": 10, "verified": 5, "pending": 4, "rejected": 1, "belum_kelompok": 10 }
}
```
FE: kartu `TOTAL 10`, `VERIFIED 5`, `PENDING 4`, `REJECTED 1`, `BELUM KELOMPOK 10`.

**Example GET /kkm/peserta?periode_id=2&page=1 (1 row):**
```json
{
  "message": "Berhasil mengambil daftar peserta KKM.",
  "data": [
    { "id": 1, "periode_id": 2, "user_id": 42, "nim": "210411001", "nama": "Andi Pratama", "email": "210411001@student.umc.ac.id", "prodi": "S1 Teknik Informatika", "fakultas": "Fakultas Teknik", "semester": 7, "status": "VERIFIED", "kelompok": null, "status_kelompok": "Belum Ditempatkan", "created_at": "2026-05-13T00:00:00.000Z", "updated_at": "2026-05-13T00:00:00.000Z" }
  ],
  "meta": { "totalData": 10, "totalPages": 1, "currentPage": 1, "limit": 10 }
}
```
Jika sudah di-assign: `"kelompok": { "id": 7, "nama": "Kelompok 07", "desa": "Astanajapura" }, "status_kelompok": "Sudah Ditempatkan"`.

**Example PATCH /kkm/peserta/bulk-status:**
```json
{ "periode_id": 2, "peserta_ids": [6,7,8], "status": "VERIFIED" }
```
Success 200: `{ "message": "Berhasil update 3 peserta menjadi VERIFIED.", "data": { "count": 3 } }`
- Validasi BE: jika `status=VERIFIED` cek `COUNT verified + pendingToVerified <= periode.target_peserta` (jika `target_peserta=0` lewati), dan `semester >= periode.minimal_semester` (400 jika tidak cukup, contoh: "3 peserta belum memenuhi minimal semester 6").

**Example POST /kkm/peserta/assign-kelompok:**
```json
{ "peserta_ids": [1,2], "kelompok_id": 7 }
```
Success 200: `{ "message": "Berhasil assign 2 peserta ke kelompok.", "data": { "count": 2 } }`
- 400 jika `peserta.periode_id != kelompok.periode_id` atau `kuota` penuh (`Kelompok penuh (kuota 12, sudah 11)`).

**Example PATCH /kkm/peserta/1/status:**
```json
{ "status": "REJECTED" }
```

**Example GET /kkm/peserta/1 (eye):**
```json
{
  "message": "Berhasil mengambil detail peserta KKM.",
  "data": { "id": 1, "periode": { "id": 2, "nama_periode": "KKM Periode 2040" }, "status": "VERIFIED", "kelompok": null, "status_kelompok": "Belum Ditempatkan", "user": { "id": 42, "nim": "210411001", "nama": "Andi Pratama", "email": "210411001@student.umc.ac.id", "semester": 7, "nomor_hp": null, "alamat": null, "fakultas": "Fakultas Teknik", "prodi": "S1 Teknik Informatika" } }
}
```

### Aturan Bisnis (jangan dilanggar)

1. **Periode wajib.** Semua `stats/list/bulk/assign` butuh `periode_id`. BE 400 jika tidak ada. Dropdown periode lock ke `periode_id` filter halaman.
2. **Kuota VERIFIED = `KkmPeriod.target_peserta`.** Jika `target_peserta=0` artinya belum dibatasi — FE jangan blok. Jika >0, `VERIFIED` tidak boleh melebihi itu (BE 400 "Kuota periode penuh").
3. **Minimal semester = `KkmPeriod.minimal_semester`.** Jika `minimal_semester=6`, peserta `semester 5` tidak bisa `VERIFIED` (BE 400). FE bisa hint di tabel jika semester < minimal.
4. **Status kelompok derived.** Jangan bikin enum baru — `kelompok_id==null ? "Belum Ditempatkan" : "Sudah Ditempatkan"`. `BELUM KELOMPOK` di kartu/tabs = `COUNT where kelompok_id is null`.
5. **Assign kelompok cek 1 periode + kuota.** Beda periode 400, kuota (`KkmLocation.kuota`) jebol 400. FE tampilkan `kuota - terisi` di dropdown kelompok.
6. **Pagination 10/halaman.** `page` default 1, pakai `meta`.

### Error handling

- 400 -> tampilkan `errors.fieldErrors` dari Zod di bawah field, atau toast `Kuota periode penuh (50)` / `X peserta belum memenuhi minimal semester 6` / `Kelompok penuh` / `Beda periode`
- 401 -> redirect login
- 403 -> toast "Hanya ADMIN LPPM" (bulk/assign hanya ADMIN)
- 404 -> "Periode/Peserta/Kelompok tidak ditemukan"

### Catatan untuk FE

- Jangan hardcode `10/5/4/1` dari screenshot atau seed — pakai `GET /stats` real. Seed sekarang `10/5/4/1/10` (semua Belum Kelompok) karena dummy tidak di-assign.
- `Search` 1 input cari semua: NIM, nama, prodi, kelompok, desa — BE sudah handle `OR`.
- Tabs `Semua/Pending/.../Belum Kelompok` — `Semua` tanpa query `status/status_kelompok`, yang lain set query & reload list.
- Bulk bar hanya muncul jika `selectedIds.length>0`. Setelah `Verified/Rejected/Assign`, clear selection & reload.
- Login dummy untuk test: `POST /auth/login { "email": "210411001@student.umc.ac.id", "password": "Mahasiswa123!" }` (role MAHASISWA). Untuk admin pakai akun ADMIN_LPPM existing.
- Abaikan `Import Mahasiswa` — jangan bikin upload Excel di FE Peserta.
- Ikuti pattern FE yang sudah ada (React Query, Tailwind, auth header). Skeleton/loading untuk tabel & 5 kartu.

Kerjakan dengan clean code.
