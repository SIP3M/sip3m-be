# PROMPT FE — Lokasi KKM (Per Desa = 1 Kelompok)

> Copy-paste prompt di bawah ke AI FE (Cursor / Claude / Codex / Gemini). Sudah disesuaikan dengan BE yang baru jadi di branch `periode-kkm` (belum push).

---

## PROMPT UNTUK AI FE

Kamu adalah Frontend Engineer untuk SIP3M (Sistem Informasi LPPM).

### Konteks BE

- Module **Lokasi KKM** sudah jadi di BE. Lokasi = **level Desa**, aturan: **1 Desa = 1 Kelompok KKM**, jadi 1 Kecamatan isinya beberapa Desa/Kelompok. Contoh: `Kec. Plumbon ada 4 kelompok` = 4 row Desa dengan `kecamatan=Plumbon` beda nama desa.
- Base URL: `http://localhost:3000/api` (prod: `https://sip3m-be.vercel.app/api`)
- Auth: `Authorization: Bearer <JWT>` (login sebagai ADMIN_LPPM untuk write)
- Swagger lengkap ada di `GET /docs` tag **KKM Lokasi**, schema `KkmLocation`.
- DB sudah live (`prisma db push` done), validasi Zod & RBAC sudah aktif.

### KOREKSI PENTING vs Mockup Lama

Mockup Figma masih ada kolom **TEMA** dan **MAKS. KELOMPOK** — **HAPUS KEDUANYA DI FE**:

- **Tema Desa TIDAK ADA** di BE (dihapus sesuai request). Jangan bikin field `tema` / `tema_desa` di form & tabel.
- **Maks. Kelompok TIDAK ADA** di BE. Karena `1 Desa = 1 Kelompok` nilainya selalu 1, jadi kolomnya tidak guna. Hapus dari tabel & modal.

### Final UI yang harus kamu bikin

**1. Halaman List: `/kkm/lokasi` (atau `/kkm/locations`)**
- Header: `Lokasi / Desa KKM` + subtitle `Manajemen lokasi dan desa penempatan KKM` + tombol `+ Tambah Lokasi` (merah, hanya ADMIN_LPPM).
- Filter di atas tabel:
  - Dropdown **Periode** (wajib pilih dulu, default = periode AKTIF dari `GET /kkm/periods/active`). Tanpa periode_id, tabel kosong + hint "Pilih periode dulu".
  - Input **Search** (cari desa/kecamatan/kabupaten)
  - Dropdown **Kecamatan**, **Kabupaten** (optional, bisa ketik)
  - Dropdown **Status**: `Tersedia` / `Penuh` (derived)
  - Tombol Reset filter
- Tabel kolom final (7 kolom saja, bukan 9):
  `DESA | KECAMATAN | KABUPATEN | KUOTA | TERISI (bar + angka) | STATUS (badge) | AKSI (mata, pensil, hapus)`
  - `TERISI` = progress bar `terisi/kuota * 100%` (sekarang masih 0 sampai modul Kelompok jadi, bar abu-abu).
  - `STATUS` = badge `Tersedia` (hijau) jika `terisi < kuota`, `Penuh` (merah) jika `terisi >= kuota` — sudah dari BE, tinggal tampilkan.
  - Empty state: "Belum ada lokasi di periode ini".
- Stats ringkas di atas/bawah tabel (ambil dari `GET /kkm/locations/stats?periode_id=1`):
  - `Total Desa: 32 | Total Kecamatan: 5 | Total Kuota: 338`
  - Opsional: breakdown per kecamatan `Plumbon (4 desa)` dsb.
- Pagination: 10/halaman, pakai `meta: { totalData, totalPages, currentPage, limit }`. Tombol Prev/Next + nomor halaman.

**2. Modal Tambah Lokasi (`Tambah Lokasi KKM`)**
- Trigger: tombol `+ Tambah Lokasi` di list.
- Field (5 field saja, tanpa Tema & tanpa Maks. Kelompok):
  1. `Periode` — dropdown dari `GET /kkm/periods` (atau auto lock ke periode yang sedang dipilih di list), required. Kirim `periode_id: number`.
  2. `Kabupaten` — text input 2-100 char, required, placeholder "Kabupaten".
  3. `Kecamatan` — text input 2-100 char, required, placeholder "Kecamatan".
  4. `Desa` — text input 2-100 char, required, placeholder "Desa".
  5. `Kuota Mahasiswa` — number 1-1000, required, placeholder "80".
- Tombol: `Batal` (close) + `Simpan` (merah, submit).
- Validasi FE sebelum submit: required, min 2 char, kuota 1-1000, trim. Tampilkan error di bawah field.
- Submit: `POST /kkm/locations` dengan body `{ periode_id, kabupaten, kecamatan, desa, kuota }`.

**3. Modal Edit Lokasi**
- Trigger: ikon pensil di row.
- Pre-fill dari `GET /kkm/locations/:id` (atau dari row data).
- Field sama 4 field (kabupaten/kecamatan/desa/kuota), periode_id tidak bisa diganti (disabled).
- Submit: `PUT /kkm/locations/:id` body `{ kabupaten, kecamatan, desa, kuota }` (partial allowed, kirim yang berubah saja).

**4. Detail Lokasi (ikon mata)**
- Bisa modal atau halaman `/kkm/lokasi/:id`.
- Tampilkan: Desa, Kecamatan, Kabupaten, Kuota, Terisi, Status, Periode (nama_periode, tahun_akademik), created_at.
- Tombol Edit & Hapus (hapus konfirmasi dulu).

### API Lengkap (prefix `/api`)

```
POST   /kkm/locations
GET    /kkm/locations?periode_id=1&page=1&search=Plumbon&kecamatan=Plumbon&kabupaten=Cirebon&status=Tersedia
GET    /kkm/locations/stats?periode_id=1
GET    /kkm/locations/:id
PUT    /kkm/locations/:id
DELETE /kkm/locations/:id
```

**Example POST:**
```json
{
  "periode_id": 1,
  "kabupaten": "Cirebon",
  "kecamatan": "Plumbon",
  "desa": "Karangmulya",
  "kuota": 12
}
```
Success 201:
```json
{ "message": "Lokasi KKM berhasil dibuat.", "data": { "id": 1, "periode_id": 1, "desa": "Karangmulya", "kecamatan": "Plumbon", "kabupaten": "Cirebon", "kuota": 12, "terisi": 0, "status": "Tersedia" } }
```

**Example GET list (periode_id=1):**
```json
{
  "message": "Berhasil mengambil daftar lokasi KKM.",
  "data": [
    { "id": 1, "desa": "Karangmulya", "kecamatan": "Plumbon", "kabupaten": "Cirebon", "kuota": 12, "terisi": 0, "status": "Tersedia", "periode": { "id": 1, "nama_periode": "KKM Reguler 2026", "tahun_akademik": "2025/2026" } }
  ],
  "meta": { "totalData": 4, "totalPages": 1, "currentPage": 1, "limit": 10 }
}
```

**Example GET stats:**
```json
{
  "message": "Berhasil mengambil statistik lokasi KKM.",
  "data": {
    "periode": { "id": 1, "nama_periode": "KKM Reguler 2026", "tahun_akademik": "2025/2026" },
    "total_desa": 4,
    "total_kecamatan": 1,
    "total_kuota": 60,
    "total_terisi": 0,
    "per_kecamatan": [{ "kecamatan": "Plumbon", "kabupaten": "Cirebon", "jumlah_desa": 4, "kuota": 60, "terisi": 0 }]
  }
}
```

### Aturan Bisnis (jangan dilanggar)

1. **Lokasi selalu nempel ke Periode.** Setiap create harus kirim `periode_id`. BE cek periode exist, jika `status=SELESAI` -> 400 "Periode sudah SELESAI, tidak bisa tambah/edit".
2. **Unique: `[periode_id, kabupaten, kecamatan, desa]`** — jika Desa yang sama di Kec/Kab yang sama di periode yang sama sudah ada -> 409. Beda periode boleh duplikat (Desa yang sama tahun beda tidak masalah).
3. **Kuota 1-1000**, required. `terisi` tidak dikirim FE, dari BE (0 dulu).
4. **RBAC:** `POST/PUT/DELETE` = ADMIN_LPPM only (403 jika bukan). `GET` (list/stats/detail) = ADMIN_LPPM + STAFF_LPPM. UI sembunyikan tombol Tambah/Edit/Hapus jika bukan ADMIN.
5. **Pagination 10/halaman**, `page` default 1.

### Error handling

- 400 -> tampilkan `errors.fieldErrors` dari Zod di bawah field form
- 401 -> redirect login
- 403 -> toast "Hanya ADMIN LPPM"
- 404 -> "Periode/Lokasi tidak ditemukan"
- 409 -> toast "Desa sudah ada di periode ini"

### Catatan untuk FE

- Jangan hardcode data desa contoh dari mockup (Astanajapura 80/80 dll itu hanya dummy, dan masih pakai format lama dengan tema & maks kelompok). Pakai data real dari API.
- `Kec. Plumbon ada 4 kelompok` dihitung otomatis: filter `kecamatan=Plumbon` akan return 4 row, atau pakai `stats.per_kecamatan[0].jumlah_desa`.
- Kolom `TERISI` progress bar sekarang 0% semua — itu expected sampai modul Kelompok/Peserta jadi. Jangan anggap bug.
- Ikuti pattern FE yang sudah ada (fetch, React Query, Tailwind, auth header).

Kerjakan dengan clean code, loading/skeleton, empty state, dan form validation di FE.
```

---

## File

File ini disimpan sebagai `PROMPT_FE_LOKASI.md` di root `sip3m-be`. Forward ke tim FE / paste ke AI FE mereka. Butuh `PROMPT_FE_KKM.md` (periode) juga sekalian?
