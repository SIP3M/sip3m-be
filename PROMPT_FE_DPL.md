# PROMPT FE — DPL KKM (Manajemen Dosen Pembimbing Lapangan)

> Copy-paste prompt di bawah ke AI FE (Cursor / Claude / Codex / Gemini). Sudah disesuaikan dengan BE yang baru jadi di branch `kkm-dpl`.

---

## PROMPT UNTUK AI FE

Kamu adalah Frontend Engineer untuk SIP3M (Sistem Informasi LPPM).

### Konteks BE

- Module **DPL KKM** sudah jadi di BE (branch `kkm-dpl`, turunan `location-kkm -> periode-kkm`).
- Prinsip data: **1 Desa (KkmLocation) = 1 Kelompok (KkmKelompok)**. Setiap `POST /kkm/locations` sukses, BE auto-create `KkmKelompok` dengan nama `Kelompok 01..N` dan `lokasi_id @unique`. Lokasi lama yang belum punya kelompok bisa backfill via `POST /kkm/kelompok/generate`.
- Relasi DPL: **1 DPL (users DOSEN) bisa pegang N Kelompok, 1 Kelompok cuma 1 DPL** (`KkmKelompok.dpl_id`). Status & stats semua **derived**, tidak ada flag kolom.
- Base URL: `http://localhost:3000/api` (prod: `https://sip3m-be.vercel.app/api`)
- Auth: `Authorization: Bearer <JWT>` (login sebagai ADMIN_LPPM untuk assign/cabut)
- Swagger lengkap ada di `GET /docs` tag **KKM DPL** & **KKM Kelompok**, schema `KkmKelompok` & `KkmDplQuota`.
- RBAC: `POST /kkm/dpl/assign`, `POST /kkm/dpl/cabut`, `POST /kkm/kelompok/generate` = `ADMIN_LPPM` only. `GET /kkm/dpl`, `GET /kkm/dpl/stats`, `GET /kkm/dpl/dosen`, `GET /kkm/dpl/kelompok`, `GET /kkm/dpl/me` = `ADMIN_LPPM + STAFF_LPPM` (assign/dosen/kelompok hanya ADMIN, `me` semua login).

### UI Target (2 screenshot)

**Screenshot 1 — Halaman `Manajemen DPL KKM` (`/kkm/dpl`)**

Kamu harus bikin 1 halaman penuh yang isinya dari atas ke bawah:

1. **Header** `Manajemen DPL KKM` + subtitle `Kelola penugasan dosen pembimbing lapangan untuk setiap kelompok KKM.` + tombol merah `+ Tugaskan DPL Baru` (buka modal, hanya ADMIN).

2. **Banner biru `Sistem Izin Dinamis DPL`** (info only, tidak ada toggle):
   - Text: `DPL_KKM = ACTIVE diberikan sementara. Akses dicabut otomatis saat penugasan berakhir.`
   - Logic: banner selalu tampil. FE bisa optional cek `GET /kkm/dpl/me` untuk user login: `is_dpl_aktif` true/false, tapi banner halaman admin tetap tampil statis.

3. **Filter bar** (di atas tabel, 1 baris):
   - Input `Cari dosen, NIDN, atau desa...` (query `search` — BE cari di name/NIDN + desa bimbingan)
   - Dropdown **Periode** (default = periode AKTIF dari `GET /kkm/periods/active`, query `periode_id`). Tanpa periode, tabel tetap load tapi `kelompok/maksimal` masih tampil.
   - Dropdown **Fakultas** (query `fakultas`, contains, mis. `Teknik`, `FKIP`).
   - Dropdown **Status**: `Aktif` / `Belum Ditugaskan` (query `status` exact `Aktif` atau `Belum Ditugaskan`).
   - Tombol `Reset` (clear semua filter).
   - Text kecil `Menampilkan X dari Y dosen` dari `meta.totalData`.

4. **4 Kartu Statistik** (ambil dari `GET /kkm/dpl/stats?periode_id=1`, jangan hardcode):
   - `Total DPL Aktif` = `total_dpl_aktif` (Dosen yang punya >=1 kelompok di periode itu)
   - `Belum Ditugaskan` = `belum_ditugaskan` (DOSEN total - aktif)
   - `Total Kelompok KKM` = `total_kelompok` (semua kelompok di periode)
   - `Rata-rata Bimbingan` = `rata_rata_bimbingan` (mis. `3.8 Klp` = assigned_kelompok / total_dpl_aktif, tampil `X Klp`)

5. **Tabel 7 kolom** (dari `GET /kkm/dpl?periode_id&page&search&fakultas&status`, 10/halaman):
   | NAMA DOSEN (avatar inisial + nama bold + NIDN kecil) | FAKULTAS / PRODI (Fakultas bold + Prodi kecil) | STATUS DPL (badge hijau `Aktif DPL` dot / abu `Belum Ditugaskan`) | KELOMPOK (icon + `4/5` + progress bar merah `count/maksimal * 100%`, `—` jika belum) | DESA BIMBINGAN (chip abu `Astanajapura`, `+2` merah jika >2, `—` jika belum) | PERIODE (`KKM Reguler 2026` line 2) | AKSI (mata detail, pensil edit, `Cabut` merah jika Aktif atau `Tugaskan` merah jika Belum) |
   - `KELOMPOK` = `kelompok.count / kelompok.maksimal` — `maksimal` bisa null jika belum ada quota & periode belum set, tampil `4/—`.
   - `DESA BIMBINGAN` = `desa_bimbingan[]` dari BE (desa dari `KkmLocation` via `KkmKelompok`). Tampilkan 2 chip pertama + `+N` jika `>2`.
   - `STATUS DPL` = `status_dpl` dari BE (`Aktif` jika `is_dpl_aktif` true).
   - Aksi `Cabut` = `POST /kkm/dpl/cabut`, `Tugaskan` = buka modal assign untuk dosen itu.
   - Empty state: "Belum ada DPL di periode ini" jika 0.

6. **Pagination** bawah tabel: `Menampilkan 10 dari 10 Dosen DPL` + `Sebelumnya | 1 | Selanjutnya`, pakai `meta`.

**Screenshot 2 — Modal `Assign DPL KKM` / `Tugaskan DPL Baru`**

Modal yang sama dipakai untuk **Tugaskan Baru** (dosen belum aktif) dan **Edit** (dosen aktif, via pensil):

- **Field 1 — Pilih Dosen \* (required, autocomplete)**
  - Input search `Cari nama dosen...` + dropdown list dari `GET /kkm/dpl/dosen?search=&limit=20`
  - Tampilkan `Nama - NIDN - Fakultas Teknik Sipil` + inisial avatar.
  - Jika modal dibuka via tombol `Tugaskan` di row `Belum Ditugaskan`, dosen auto-terpilih & disabled.
  - Jika via `+ Tugaskan DPL Baru` (header), dosen wajib dipilih dulu.

- **Field 2 — Periode KKM \* (required, dropdown)**
  - Dropdown dari `GET /kkm/periods` (atau `GET /kkm/periods/active` default).
  - Lock ke `periode_id` yang sedang dipilih di filter halaman. Kirim `periode_id: number`.
  - Saat ganti periode, reload checklist kelompok.

- **Field 3 — Kelompok KKM \* (checkbox list, min 1 dipilih)**
  - List dari `GET /kkm/dpl/kelompok?periode_id=1&unassigned_only=true&search=`
  - Tiap row: checkbox + `Kelompok 01` bold + `Astanajapura  ● 10` (icon lokasi + kuota) di kanan.
  - `unassigned_only=true` hanya kelompok yang `dpl_id=null`. Untuk mode Edit, panggil tanpa `unassigned_only` atau `unassigned_only=false` jadi kelompok milik dosen itu juga muncul ter-check.
  - Counter di label: `Kelompok KKM * (2 dipilih)`.
  - Validasi: max terpilih tidak boleh melebihi `Maksimal Kelompok`.

- **Field 4 — Maksimal Kelompok (number 1-20, editable)**
  - Default: ambil dari `GET /kkm/dpl?periode_id` untuk dosen itu (`kelompok.maksimal`) atau dari `KkmPeriod.maks_kelompok_per_dosen` jika belum ada quota.
  - Placeholder `3`, bisa diedit. BE akan **override per-dosen per-periode** (upsert `KkmDplQuota`).
  - Jika `periode.maks_kelompok_per_dosen` ada, input tidak boleh > itu (BE 400).

- **Info `Beban Bimbingan`** (progress bar abu, text kanan hijau):
  - `0 dari 3 kelompok` → `dipilih.length + existingCount dari  maksimal_kelompok`
  - Untuk create baru, `0 dari 3`. Untuk edit, jika dosen sudah punya 2 kelompok dan pilih 1 lagi + maksimal 5 → `3 dari 5`.
  - Bar width `dipilih/total * 100%`.

- **Banner bawah (2 box, tidak ada toggle switch di BE):**
  - Box biru: `Aktifkan akses menu KKM otomatis — Dosen akan otomatis memperoleh akses fitur KKM pada akun mereka.` (info only)
  - Box kuning: `Role tetap DOSEN. Dosen memperoleh akses KKM berdasarkan penugasan aktif oleh LPPM. Akses otomatis dicabut saat penugasan berakhir.` (info only)
  - Tidak ada field `aktifkan_akses` di BE, role tetap `DOSEN`, `is_dpl_aktif` derived dari `exists KkmKelompok where dpl_id=userId & periode AKTIF`. Otomatis cabut saat `POST /kkm/dpl/cabut` atau periode `SELESAI`. FE jangan bikin switch.

- **Tombol** `Batal` (close) + `Tugaskan Sebagai DPL` (merah, disabled sampai dosen + periode + >=1 kelompok terpilih, loading saat submit).
- **Submit:** `POST /kkm/dpl/assign` dengan body `{ dosen_id, periode_id, kelompok_ids: number[], maksimal_kelompok: number }`.

### API Lengkap (prefix `/api`)

```
GET  /kkm/dpl?periode_id=1&page=1&search=Ahmad&fakultas=FT&status=Aktif
GET  /kkm/dpl/stats?periode_id=1
GET  /kkm/dpl/dosen?search=Dewi&limit=20
GET  /kkm/dpl/kelompok?periode_id=1&unassigned_only=true&search=Astanajapura
GET  /kkm/dpl/me
POST /kkm/dpl/assign
POST /kkm/dpl/cabut
POST /kkm/kelompok/generate
```

**Example GET /kkm/dpl?periode_id=1 (row):**
```json
{
  "message": "Berhasil mengambil daftar DPL KKM.",
  "data": [
    {
      "dosen": { "id": 10, "name": "Dr. Ahmad Fauzi, M.Kom", "nidn_nip": "0412028801", "fakultas": "Teknik", "prodi": "Teknik Informatika" },
      "status_dpl": "Aktif",
      "is_dpl_aktif": true,
      "kelompok": { "count": 4, "maksimal": 5 },
      "desa_bimbingan": ["Astanajapura", "Palimanan", "Kedawung"],
      "periode": { "id": 1, "nama_periode": "KKM Reguler 2026", "tahun_akademik": "2025/2026" }
    },
    {
      "dosen": { "id": 20, "name": "Ir. Dewi Lestari, M.T.", "nidn_nip": "0615018901", "fakultas": "Teknik", "prodi": "Teknik Sipil" },
      "status_dpl": "Belum Ditugaskan",
      "is_dpl_aktif": false,
      "kelompok": { "count": 0, "maksimal": null },
      "desa_bimbingan": [],
      "periode": null
    }
  ],
  "meta": { "totalData": 8, "totalPages": 1, "currentPage": 1, "limit": 10 }
}
```
FE: `KELOMPOK` tampil `4/5` + bar `80%`, `DESA BIMBINGAN` tampil `Astanajapura` `Palimanan` `+1`, `PERIODE` tampil `KKM Reguler 2026`.

**Example GET /kkm/dpl/stats?periode_id=1:**
```json
{
  "message": "Berhasil mengambil statistik DPL KKM.",
  "data": {
    "periode": { "id": 1, "nama_periode": "KKM Reguler 2026", "tahun_akademik": "2025/2026" },
    "total_dpl_aktif": 5,
    "belum_ditugaskan": 2,
    "total_kelompok": 19,
    "rata_rata_bimbingan": 3.8
  }
}
```
FE: kartu `Total DPL Aktif 5`, `Belum Ditugaskan 2`, `Total Kelompok 19`, `Rata-rata 3.8 Klp`.

**Example POST /kkm/dpl/assign:**
```json
{
  "dosen_id": 20,
  "periode_id": 1,
  "kelompok_ids": [1, 2, 3],
  "maksimal_kelompok": 3
}
```
Success 200: `{ "message": "DPL berhasil ditugaskan.", "data": [ { "id": 1, "nama": "Kelompok 01", "dpl_id": 20 } ] }`
- Upsert `KkmDplQuota` untuk (periode_id, dosen_id) → `maksimal_kelompok=3`.
- Validasi BE: `kelompok_ids` harus 1 periode yang sama, belum punya DPL lain (409), `length <= maksimal_kelompok`, `maksimal_kelompok <= periode.maks_kelompok_per_dosen` (jika ada), blok jika `periode.status=SELESAI`.

**Example POST /kkm/dpl/cabut:**
```json
{ "dosen_id": 10, "periode_id": 1 }
```
Success 200: `{ "message": "Tugas DPL berhasil dicabut.", "data": { "count": 4 } }` — null-kan `dpl_id` 4 kelompok milik DPL itu.

**Example POST /kkm/kelompok/generate:**
```json
{ "periode_id": 1 }
```
Success 200: `{ "message": "4 kelompok berhasil dibuat.", "data": { "created": 4 } }`
- Untuk backfill: lokasi lama yang `kelompok=null` akan dibuat `Kelompok NN`. Lokasi baru auto-create jadi tidak perlu panggil lagi.

**Example GET /kkm/dpl/me (untuk Dosen login):**
```json
{ "message": "Berhasil cek status DPL.", "data": { "is_dpl_aktif": true, "user_id": 10 } }
```
FE Dosen: jika `is_dpl_aktif=true`, tampilkan menu KKM. Role tetap `DOSEN`.

### Aturan Bisnis (jangan dilanggar)

1. **Maksimal Kelompok = override per-dosen per-periode.** Default ikut `KkmPeriod.maks_kelompok_per_dosen` (jika null → bebas 1-20), tapi di modal bisa diedit. BE simpan di `KkmDplQuota` unique `[periode_id, dosen_id]`. Total kelompok DPL setelah assign tidak boleh melebihi maksimal itu.
2. **1 desa = 1 kelompok @unique.** `KkmKelompok.lokasi_id @unique` jamin tidak bisa 2 kelompok di desa sama. `POST /kkm/kelompok/generate` skip yang sudah punya kelompok.
3. **Akses DPL derived.** Role user tetap `DOSEN`, tidak ada flag `is_dpl`. `is_dpl_aktif = exists KkmKelompok where dpl_id=userId AND periode.status=AKTIF`. Otomatis hilang saat `Cabut` atau periode `SELESAI`. Banner "Sistem Izin Dinamis DPL" cukup info.
4. **Blok periode SELESAI.** `POST /kkm/dpl/assign` 400 jika `periode.status=SELESAI`.
5. **Pagination 10/halaman.** `page` default 1, `status` filter derived (`Aktif` = count>0).

### Error handling

- 400 → tampilkan `errors.fieldErrors` dari Zod di bawah field, atau toast `Maksimal kelompok untuk periode ini adalah X` / `Jumlah kelompok melebihi maksimal` / `Periode sudah SELESAI`
- 401 → redirect login
- 403 → toast "Hanya ADMIN LPPM"
- 404 → "Periode/Dosen/Kelompok tidak ditemukan"
- 409 → toast "Kelompok sudah ditugaskan ke DPL lain"

### Catatan untuk FE

- Jangan hardcode `5 / 2 / 19 / 3.8` dari screenshot, pakai `stats` real.
- `Cari dosen, NIDN, atau desa` input `search` akan match nama/NIDN + desa bimbingan (BE sudah handle, tapi filter desa post-db jadi paginasi bisa perlu reload).
- `Kelompok KKM * (0 dipilih)` counter update live saat checkbox diklik.
- Ikuti pattern FE yang sudah ada (React Query, Tailwind, auth header). Skeleton/loading untuk tabel & stats.
- Untuk inisial avatar: 2 huruf pertama nama (`DA` untuk `Dr. Ahmad...`).

Kerjakan dengan clean code.
