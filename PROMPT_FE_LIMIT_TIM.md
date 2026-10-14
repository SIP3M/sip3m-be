# PROMPT FE — Limit Tim Peneliti 5 Dosen + 5 Mahasiswa (Opsi A)

> Copy-paste ke AI FE (Cursor/Claude/Codex). Branch BE `limit-tim-5` (turunan `auth-single-session` fix `jwtid`).

## Konteks BE

- Field tim proposal masih `@db.Text` CSV (`,;\n`), tapi sekarang **validasi limit 5** di BE.
- `Opsi A: 5 dosen + 5 mahasiswa terpisah`, ketua tidak hitung.
- Endpoint `POST /api/proposals`, `PUT /api/proposals/:id`, `PATCH /api/proposals/:id` (multipart/form-data + field tim) pakai Zod `superRefine` yang sama. Error `400 { message: "Validasi data gagal.", errors: { dosen_terlibat: ["Maksimal 5 dosen..."], nidn_dosen_terlibat: [...], nama_anggota: [...], nim_anggota: [...] } }`.

## Aturan BE (ingat, jangan langgar)

1. `dosen_terlibat` max 5 nama. `nidn_dosen_terlibat` max 5 NIDN. Jika keduanya diisi, jumlah harus sama (berpasangan urut).
2. `nama_anggota` max 5. `nim_anggota` max 5. Jika keduanya diisi, jumlah harus sama.
3. Tetap `anti-duplikat` (nama/NIDN/NIM duplikat -> 400) dan `ketua != anggota` (nama/NIDN ketua tidak boleh sama dengan anggota dosen).
4. Pisah `,`, `;`, atau baris baru. `edit` (PATCH) juga dicek kalau field tim dikirim; `POST` draft masih cek (is_draft tidak bypass limit tim).
5. Data lama >5 masih di DB, tapi `edit` akan 400 sampai dikurangi.

## Yang harus kamu kerjakan di FE

### 1. Form Proposal — hint + validasi client (sebelum hit BE)

- Hint di input: `Maks 5, dipisah koma/semicolon/enter. Contoh: Dr. Budi, Dr. Sari`. Placeholder sama untuk NIDN/NIM.
- Validasi onChange/onBlur: `split(/[,;\n]+/).filter(Boolean).length > 5` -> error inline `Maksimal 5 ...`, disable Submit. Validasi pasangan: `count(nama) !== count(NIDN/NIM)` jika keduanya terisi -> error `Jumlah ... harus sama`.
- Counter `3/5` di bawah field.

### 2. Tampilkan error BE dengan benar

- `catch` 400 `fieldErrors` -> mapping ke `formErrors.dosen_terlibat`, `nidn_dosen_terlibat`, `nama_anggota`, `nim_anggota`. Jangan cuma toast generik.

### 3. Swagger contoh

- Lihat `GET /docs` Proposal schema description sudah update.

### Cara tes (wajib)

- `dosen_terlibat: "A,B,C,D,E,F"` (6) -> 400 `Maksimal 5 dosen terlibat. Saat ini 6.`
- `dosen_terlibat:"A,B"` + `nidn_dosen_terlibat:"1"` -> 400 jumlah tidak sama.
- `5+5` -> 201/200. `edit PATCH` ganti jadi 6 -> 400.
