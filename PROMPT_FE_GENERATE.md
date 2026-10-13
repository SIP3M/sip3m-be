# PROMPT FE — Generate Kelompok KKM (1 Desa = 1 Kelompok, Rata)

> Copy-paste prompt di bawah ke AI FE (Cursor / Claude / Codex / Gemini). Sudah disesuaikan dengan BE yang baru jadi di branch `kkm-generate`.

---

## PROMPT UNTUK AI FE

Kamu adalah Frontend Engineer untuk SIP3M (Sistem Informasi LPPM).

### Konteks BE

- Module **Generate Kelompok KKM** sudah jadi di BE (branch `kkm-generate`, turunan `peserta-kkm -> kkm-dpl -> location-kkm -> periode-kkm`).
- Prinsip **1 Desa = 1 Kelompok** (`KkmKelompok.lokasi_id @unique`). Jumlah kelompok **fix = jumlah desa** (`KkmLocation` per periode, dari `POST /kkm/locations` auto-seed `Kelompok 01..N`). `Generate` = **distribusi `KkmPeserta.kelompok_id` ke `KkmKelompok` yang sudah ada**, bukan create kelompok baru. `POST /kkm/kelompok/generate` lama tetap untuk backfill, tidak dipakai untuk peserta.
- **200 dummy MAHASISWA** sudah ada: `210411001..200@student.umc.ac.id / Mahasiswa123!`, semester 5-8 (beberapa sem 3 untuk validasi `belum syarat`), sebar Fakultas/Prodi, semua `kkmPeserta.status VERIFIED 180 / PENDING 12 / REJECTED 8`, semua `kelompok_id=null` (Belum Ditempatkan). **30 desa dummy** `Plumbon/Weru/Kedawung/...` + 30 `KkmKelompok` (1 Desa=1 Kelompok) di `periode_id=2` (KKM Periode 2040). Jadi preview: `180 VERIFIED / 30 desa = 6 orang/kelompok rata sempurna`.
- Algoritma BE: **Stratified Snake Round-Robin + Skor Kapasitas**. Filter `VERIFIED + kelompok_id is null + semester>=minimal_semester`, Stratify `group by prodi -> shuffle -> interleave` (CAMPUR), sort kelompok `KUOTA desc` atau `RANDOM`, distribusi ular `0..K-1, K-1..0...` + skor `(terisi/kapasitas)*0.5 + prodi sama*0.3 + jomplang gender*0.2` untuk `MIN_3_PRODI` / `gender_balance`. Hasil deterministik `O(N log K)`.
- Base URL: `http://localhost:3000/api` (prod: `https://sip3m-be.vercel.app/api`)
- Auth: `Authorization: Bearer <JWT>` (login sebagai ADMIN_LPPM untuk preview/execute; `periode_id=2` untuk demo)
- Swagger lengkap ada di `GET /docs` tag **KKM Generate**.
- RBAC: `GET /kkm/generate/stats`, `GET /validasi`, `GET/POST /preview` = `ADMIN_LPPM + STAFF_LPPM`. `POST /kkm/generate/execute` = `ADMIN_LPPM` only.

### UI Target (4 screenshot Figma)

Bikin **1 halaman wizard / 1 page dengan 6 step** `Generate Kelompok` (route mis. `/kkm/generate`), sesuai urutan Gambar 4:

**Step 1 — Pilih Periode**
- Card `Periode KKM` dengan dropdown `Pilih Periode *` dari `GET /kkm/periods` (default `GET /kkm/periods/active` atau `periode_id=2` untuk demo). Hint: "Kelompok akan dibuat berdasarkan periode KKM yang dipilih." atau "Peserta akan didistribusikan ke kelompok di periode ini." (sesuaikan teks 1 Desa=1 Kelompok).
- Setelah pilih, auto fetch `GET /kkm/generate/stats?periode_id=2` untuk Step 2.

**Step 2 — Data Peserta Siap Generate** (2 baris statistik dari `GET /kkm/generate/stats?periode_id=2`):
- Row 1: `Total Peserta: 200 | Sudah Verified: 180` (dari `total_peserta` / `sudah_verified`)
- Row 2: `Belum Verifikasi: 12 | Belum Memiliki Kelompok: 200 | Belum Memenuhi Syarat: 15 | Total Memenuhi Syarat: 165` (hitungan BE: `siap = verified - belum_syarat`). Hint bawah: "Hanya mahasiswa terverifikasi yang akan diproses." atau "X mahasiswa siap generate."
- Jangan hardcode `1248/1180/68/1180/25/1180` dari Figma - pakai `stats` real. Figma label `Sudah Verified` = `sudah_verified`, `Belum Verifikasi` = `belum_verifikasi` (PENDING), `Belum Kelompok` = `belum_kelompok`, `Belum Memenuhi Syarat` = `belum_syarat_semester`.

**Step 3 — Konfigurasi Pembagian** (form, sesuai Gambar 2):
- `Jumlah Anggota per Kelompok` — number input `1-50`, default `10`, required. Estimasi di bawahnya: `Estimasi 118 kelompok akan dibuat` -> untuk 1 Desa=1 Kelompok ubah jadi `Estimasi: 30 kelompok tersedia, ±6 orang/kelompok (180/30)`. Jika `jumlah * total_desa < siap`, tampilkan warning kuning.
- `Pola Pembagian Prodi` — dropdown/radio `Campur Semua Prodi` (`CAMPUR`) / `Minimal 3 Prodi Berbeda` (`MIN_3_PRODI`) / `Berdasarkan Fakultas` (`FAKULTAS`) / `Bebas / Random` (`RANDOM`). Default `CAMPUR`. Simpan ke `pola_prodi`.
- `Gender Balance` — checkbox `Seimbangkan laki-laki dan perempuan` -> `gender_balance` boolean. Hint: "Sistem akan mencoba menyeimbangkan komposisi gender."
- `Lokasi Penempatan` — dropdown `Random` (`RANDOM`) / `Berdasarkan Kuota Desa` (`KUOTA`). Tema Desa sudah dihapus di BE, jadi tidak ada `Berdasarkan Tema Desa`. Simpan ke `lokasi_mode`.
- `Assign DPL Otomatis` — radio `Ya`/`Tidak` -> `assign_dpl_otomatis`. Jika Ya, tampilkan `Metode Assign DPL`: `Random` / `Berdasarkan Fakultas` / `Beban Seimbang` + `Maks. Kelompok per DPL` number `1-20` default `2`. Untuk MVP BE hanya preview DPL, commit peserta saja - FE cukup kirim flag, tidak perlu blok.
- `Kuota Desa` — checkbox `Ikuti kapasitas desa` (`ikuti_kuota_desa` default `true`). Hint: "Kelompok tidak akan melebihi kuota maksimal desa." Jika ON, BE pakai `min(kuota, jumlah_anggota)` sebagai kapasitas.

**Step 4 — Validasi Data** (card hijau/kuning/merah dari `GET /kkm/generate/validasi?periode_id=2&jumlah_anggota_per_kelompok=10`):
- List checklist:
  - ✅ `180 mahasiswa terverifikasi siap diproses` (hijau, `siap_diproses`)
  - ✅ `30 desa tersedia untuk penempatan` (hijau, `total_desa`)
  - ⚠️ `5 desa hampir mencapai kuota penuh` (kuning, `desa_hampir_penuh >0`)
  - 🔴 `47 DPL tersedia` atau `0 DPL tersedia` (merah jika 0, dari `dpl_tersedia` / `total_dosen`)
  - 🔴 `15 DPL tersedia` / `X mahasiswa belum memenuhi syarat semester` (merah, `belum_syarat`)
  - ⚠️ `2 prodi memiliki distribusi tidak seimbang` (kuning, `prodi_tidak_seimbang`)
- Kotak `Rekomendasi` kuning: `Kurangi anggota per kelompok menjadi 6 mahasiswa untuk distribusi yang lebih merata.` atau `Tambah desa / kurangi anggota`. Ambil dari `rekomendasi` string BE (jika null, sembunyikan). Ini yang Figma "Kurangi ke 9".

**Step 5 — Klik Generate Kelompok**
- Tombol `Generate Kelompok` (merah, disabled jika `errors.length>0` di validasi atau `Belum ada desa`). Sebelum itu FE bisa tombol `Preview` (secondary) untuk `POST /kkm/generate/preview` tanpa simpan.

**Step 6 — Preview Hasil Generate** (card dari `POST /kkm/generate/preview` dry-run, Gambar 4):
- Jika belum pernah generate: tampilkan placeholder 6 bullet `1 Pilih periode... 6 Review hasil & simpan kelompok` (Figma Gambar 4 kosong).
- Setelah `preview` sukses: list `per_kelompok` (30 row): `Kelompok 01 Karangmulya (Plumbon) — Kuota 10 — 6 anggota — L3/P3 — TI 2, Manajemen 2, PGSD 2` + `anggota_preview` 5 orang pertama `210411001 Andi Pratama TI 7 L`. Tampilkan `jumlah_anggota` harus `6` semua (180/30 rata), `kapasitas_efektif`, `gender`, `prodi_mix`.
- Tombol `Simpan Kelompok` atau `Execute` -> `POST /kkm/generate/execute` dengan body config yang sama. Setelah sukses toast `180 peserta didistribusikan ke 30 kelompok` + redirect ke `GET /kkm/peserta?periode_id=2` untuk lihat `Sudah Ditempatkan` atau ke DPL.

### API Lengkap (prefix `/api`)

```
GET  /kkm/generate/stats?periode_id=2
GET  /kkm/generate/validasi?periode_id=2&jumlah_anggota_per_kelompok=10
GET  /kkm/generate/preview?periode_id=2&jumlah_anggota_per_kelompok=10&pola_prodi=CAMPUR&gender_balance=false&lokasi_mode=RANDOM&ikuti_kuota_desa=true
POST /kkm/generate/preview   { periode_id, jumlah_anggota_per_kelompok, pola_prodi, gender_balance, lokasi_mode, assign_dpl_otomatis, metode_dpl, maks_kelompok_per_dpl, ikuti_kuota_desa }
POST /kkm/generate/execute   { periode_id, jumlah_anggota_per_kelompok, pola_prodi, gender_balance, lokasi_mode, assign_dpl_otomatis, metode_dpl, maks_kelompok_per_dpl, ikuti_kuota_desa }
```

**Example GET /kkm/generate/stats?periode_id=2:**
```json
{
  "message": "Berhasil mengambil statistik generate KKM.",
  "data": { "periode": { "id": 2, "nama_periode": "KKM Periode 2040" }, "total_peserta": 200, "sudah_verified": 180, "belum_verifikasi": 12, "belum_kelompok": 200, "total_desa": 30, "total_kelompok": 30, "dpl_tersedia": 5, "total_dosen": 47, "belum_syarat_semester": 4, "desa_hampir_penuh": 0, "prodi_tidak_seimbang": 0 }
}
```

**Example POST /kkm/generate/preview:**
```json
{ "periode_id": 2, "jumlah_anggota_per_kelompok": 10, "pola_prodi": "CAMPUR", "gender_balance": true, "lokasi_mode": "RANDOM", "ikuti_kuota_desa": true }
```
Response 200 `per_kelompok[0] = { kelompok_id: 1, nama: "Kelompok 01", desa: "Karangmulya", kecamatan: "Plumbon", kuota: 10, kapasitas_efektif: 10, jumlah_anggota: 6, gender: { L:3, P:3 }, prodi_mix: { "1":2, "2":2 }, anggota_preview: [{ nim:"210411001", nama:"Andi Pratama", prodi:"S1 Teknik Informatika", fakultas:"Fakultas Teknik", semester:7, jenis_kelamin:"Laki-laki" }] }`

**Example POST /kkm/generate/execute:**
```json
{ "periode_id": 2, "jumlah_anggota_per_kelompok": 10, "pola_prodi": "CAMPUR", "gender_balance": false, "lokasi_mode": "RANDOM", "ikuti_kuota_desa": true }
```
Success 200: `{ "message": "Berhasil generate: 174 peserta didistribusikan ke 30 kelompok.", "data": { "updated": 174, "preview": { "total_peserta": 174, "total_kelompok": 30, "per_kelompok": [{ "kelompok_id":1, "nama":"Kelompok 01", "desa":"Karangmulya", "jumlah_anggota":6 }] } } }`

### Aturan Bisnis (jangan dilanggar)

1. **1 Desa = 1 Kelompok fix.** Jumlah kelompok = `KkmLocation` count di periode. `jumlah_anggota_per_kelompok` hanya untuk kapasitas, bukan untuk create kelompok. `estimasi_kelompok_akan_dibuat = total_desa`.
2. **Estimasi Figma 118 tidak dipakai.** Estimasi real = `ceil(siap / total_desa)` orang/kelompok. Jika `siap > kapasitasWithConfig`, BE kasih `rekomendasi` di validasi.
3. **Ikuti kuota desa.** Jika `ikuti_kuota_desa=true`, `kapasitas = min(kuota, jumlah_anggota)`. Jika `jumlah_anggota > kuota` di desa kecil (kuota 8), BE 400 di execute.
4. **Hanya VERIFIED + syarat semester yang diproses.** `PENDING/REJECTED` dan `semester < minimal_semester` tidak ikut generate.
5. **RBAC:** `execute` hanya `ADMIN_LPPM`. Stats/validasi/preview boleh `ADMIN+STAFF`.

### Error handling

- 400 -> tampilkan `message` BE: "Belum ada kelompok (desa) di periode ini. Tambah lokasi dulu." / "Kelompok 01 melebihi kuota desa 8" / "Periode sudah SELESAI" / "Tidak ada peserta siap generate"
- 401 -> redirect login
- 403 -> toast "Hanya ADMIN LPPM"

### Catatan untuk FE

- Jangan hardcode `30 desa / 180 verified` - pakai `GET /stats` real. Seed demo `30/180/6` rata, di prod bisa `32 desa / 1180 peserta / 37 per kelompok`.
- Step validasi: jika `errors.length>0` disable `Generate`, jika `warnings` tampilkan kuning.
- Preview bisa dipanggil berulang (dry-run) tanpa simpan - FE pakai `POST /preview` saat user ganti `Pola Prodi` untuk lihat bedanya.
- Setelah `execute`, `GET /kkm/peserta/stats?periode_id=2` akan `belum_kelompok: 0` dan `GET /kkm/peserta?status_kelompok=SudahDitempatkan` akan 180 row.

Kerjakan dengan clean code, loading/skeleton untuk stats/validasi/preview.
