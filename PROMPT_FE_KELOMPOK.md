# PROMPT FE — Halaman Kelompok KKM (List + Detail + Edit + Dokumen)

> Copy-paste ke AI FE (Cursor / Claude / Codex). Sudah disesuaikan dengan BE branch `kelompok-kkm` (turunan `limit-tim-5 -> auth-single-session -> kkm-generate -> ...`).

---

## PROMPT UNTUK AI FE

Kamu adalah Frontend Engineer untuk SIP3M (Sistem Informasi LPPM).

### Konteks BE

- Module **Kelompok KKM** sudah jadi di BE (branch `kelompok-kkm`). 8 endpoint baru di bawah prefix `/api`, semua sudah ada di Swagger `GET /docs` tag **KKM Kelompok**.
- Prinsip **1 Desa = 1 Kelompok** (`KkmKelompok.lokasi_id @unique`). Jumlah kelompok = jumlah desa per periode.
- **Status kelompok (derived dari isi vs kuota desa, bukan kolom DB):**
  - `AKTIF` = terisi **≥ 80%** kuota
  - `BELUM_LENGKAP` = terisi **50% – <80%**
  - `BERMASALAH` = terisi **< 50%**
- **Komposisi (derived):**
  - `PERLU_PENYESUAIAN` = status BERMASALAH atau ada anggota `jenis_kelamin` null
  - `DOMINASI` = satu gender > 60% **atau** satu prodi > 50% anggota
  - `SEIMBANG` = sisanya
- **Progress KKM** di `GET /kkm/kelompok/:id` derived dari tanggal `KkmPeriod` (5 tahap: Pembentukan ✓selalu → Pembekalan `tgl_pembekalan` → Pelaksanaan `tgl_pelaksanaan` → Logbook `tgl_penarikan` → Laporan Akhir `deadline_laporan`). FE tinggal render `stages[]` + `tahap_saat_ini`.
- **TIDAK dibikin:** Program Kerja, Riwayat Aktivitas, endpoint cetak (cetak = `window.print` di FE).
- Auth: `Authorization: Bearer <JWT>` + `X-Device-Id` (lihat `PROMPT_FE_SESSION.md`).
- RBAC: GET list/stats/detail = `ADMIN_LPPM` + `STAFF_LPPM`; mutations (PATCH, anggota, dokumen) = `ADMIN_LPPM` saja.

### Halaman 1 — List Kelompok KKM (card grid + 5 kartu stats)

1. **5 kartu stats** — `GET /api/kkm/kelompok/stats?periode_id=N`
   → `{ total_kelompok, aktif, belum_lengkap, bermasalah, total_mahasiswa }`
   Kartu: Total Kelompok, Aktif (hijau), Belum Lengkap (kuning), Bermasalah (merah), Total Mahasiswa.
2. **Filter bar:** search (kelompok/DPL/desa/kecamatan), dropdown periode (`GET /api/kkm/periods`), dropdown status (`AKTIF|BELUM_LENGKAP|BERMASALAH`), dropdown desa (`GET /api/kkm/locations?periode_id=N`), dropdown DPL (`GET /api/kkm/dpl?periode_id=N`), dropdown komposisi (`SEIMBANG|DOMINASI|PERLU_PENYESUAIAN`).
3. **Card list** — `GET /api/kkm/kelompok?periode_id=N&page=&search=&status=&komposisi=&desa=&dpl_id=`
   Tiap item: `nama`, `dpl_name` ("Belum ada DPL" jika null), `lokasi.desa + kecamatan`, `jumlah_anggota / kuota anggota` + progress bar (`persentase_terisi`; warna: ≥80% hijau, 50-80% kuning, <50% merah), `gender {laki, perempuan}` ikon ♂♀, `terverifikasi/jumlah_anggota terverifikasi`, chip prodi (max 5 + `+N lainnya`), badge `status`, badge `komposisi`, tombol **Detail** (→ `/kelompok/:id`), **Edit** (→ `/kelompok/:id/edit`), **Cetak** (`window.print()`).
   Pagination `meta { totalData, totalPages, currentPage }` (limit 12).
   **Catatan filter status/komposisi:** BE filter in-memory setelah aggregate, jadi tetap server-side — FE tinggal kirim query param.

### Halaman 2 — Detail Kelompok (`GET /api/kkm/kelompok/:id`)

Layout 2 kolom:
- **Kiri:**
  - *Informasi Kelompok*: `periode.nama_periode + tahun_akademik`, `dpl.name` (atau "Belum ada DPL"), `lokasi.desa`, `lokasi.kecamatan`, `jumlah_anggota / kuota`, bar `persentase_terisi`.
  - *Komposisi Kelompok*: badge `komposisi` + pie chart `prodi[] {nama, jumlah}`.
  - *Distribusi Gender*: 2 kartu `gender.laki` / `gender.perempuan`.
  - *Dokumen Kelompok*: daftar `dokumen[]` (lihat bawah).
- **Kanan:**
  - 3 kartu: `verifikasi.verified` (hijau), `verifikasi.pending` (kuning), `verifikasi.rejected` (merah).
  - *Progress KKM*: stepper `progress.stages[] {label, date, done}` + `progress.tahap_saat_ini` (tahap aktif = merah/kuning, done = hijau ✓, belum = abu).
  - *Daftar Anggota*: tabel `anggota[] {peserta_id, nim, nama, prodi, fakultas, jenis_kelamin, semester, status, email, nomor_hp}` — kolom NIM, NAMA, PRODI/FAK., GENDER (♂ L / ♀ P), STATUS (badge Verified/Pending/Rejected), AKSI:
    - 👁 lihat → modal detail anggota (data dari row, tidak perlu GET tambahan)
    - ↔ pindah → `POST /api/kkm/peserta/assign-kelompok { peserta_ids:[peserta_id], kelompok_id }` (pilih kelompok lain dari `GET /api/kkm/kelompok?periode_id=N`)
    - 🗑 hapus → `DELETE /api/kkm/kelompok/:id/anggota/:pesertaId` (peserta kembali "Belum Ditempatkan", tidak dihapus)
    - Search anggota bisa client-side (data sudah lengkap di response).
  - Header tombol: **Edit Kelompok** (→ edit page), **Ganti DPL** (bisa shortcut ke form DPL di edit), **Cetak Daftar** (`window.print()`).

### Halaman 3 — Edit Kelompok (`PATCH /api/kkm/kelompok/:id`)

Panel kiri *Pengaturan Kelompok*:
- **Desa Penempatan: READ-ONLY** (label biasa, bukan dropdown) + hint `1 Desa = 1 Kelompok — ubah desa lewat menu Lokasi KKM`.
- **DPL dropdown** — daftar dari `GET /api/kkm/dpl/dosen?search=` (typeahead). Simpan → `PATCH /api/kkm/kelompok/:id { dpl_id }`. Cabut DPL → `{ dpl_id: null }`.
  Error BE: `400 kuota DPL penuh`, `409 sudah punya DPL lain` (tawarkan Ganti DPL), `400 periode SELESAI`.

Panel kanan *Anggota*:
- **+ Tambah Mahasiswa** → modal pilih dari `GET /api/kkm/peserta?periode_id=N&status_kelompok=BelumDitempatkan` (multi-select) → `POST /api/kkm/kelompok/:id/anggota { peserta_ids: [] }`.
  Error: `400 kelompok penuh (kuota X, sudah Y)`, `400 peserta sudah di kelompok lain` (arahkan pakai pindah).
- **🗑 per baris** → `DELETE /api/kkm/kelompok/:id/anggota/:pesertaId`.
- Setelah sukses: refetch detail + toast.

### Dokumen Kelompok (di Detail + Edit)

3 slot tetap: `PROPOSAL_PROGRAM_KERJA`, `LOGBOOK_KELOMPOK`, `LAPORAN_AKHIR`.
- List sudah include di `GET /kkm/kelompok/:id` → `dokumen[] { id, document_type, title, file_size, mime_type, uploaded_at, uploaded_by, url }` (url = public URL Supabase, tombol 👁 buka di tab baru, ⬇ download).
- Upload (ganti file): `POST /api/kkm/kelompok/:id/dokumen` **multipart/form-data** field `file` (PDF, maks 10 MB) + `document_type`. Upload baru otomatis **menggantikan** yang lama.
- Hapus: `DELETE /api/kkm/kelompok/dokumen/:docId`.
- State slot: `Terupload` (ada data, tampilkan title + tanggal) / `Belum diupload` (tidak ada row utk type itu).

### Contoh Lengkap Response (GET /kkm/kelompok/:id)

```json
{
  "message": "Berhasil mengambil detail kelompok KKM.",
  "data": {
    "id": 1, "nama": "Kelompok 01",
    "status": "AKTIF", "komposisi": "SEIMBANG",
    "persentase_terisi": 100, "jumlah_anggota": 10, "kuota": 10,
    "verifikasi": { "verified": 8, "pending": 2, "rejected": 0 },
    "periode": { "id": 2, "nama_periode": "KKM Periode 2040", "tahun_akademik": "2039/2040", "jenis": "REGULER", "status": "AKTIF" },
    "progress": {
      "stages": [
        { "key": "PEMBENTUKAN", "label": "Pembentukan", "date": null, "done": true },
        { "key": "PEMBEKALAN", "label": "Pembekalan", "date": "2026-10-11", "done": true },
        { "key": "PELAKSANAAN", "label": "Pelaksanaan", "date": "2026-10-12", "done": true },
        { "key": "LOGBOOK", "label": "Logbook", "date": "2026-10-13", "done": true },
        { "key": "LAPORAN_AKHIR", "label": "Laporan Akhir", "date": "2026-10-14", "done": false }
      ],
      "tahap_saat_ini": "Laporan Akhir"
    },
    "lokasi": { "id": 1, "desa": "Astanajapura", "kecamatan": "Astanajapura", "kabupaten": "Cirebon", "kuota": 10 },
    "dpl": { "id": 16, "name": "Dr. Ahmad Fauzi, M.Kom", "email": "ahmad@umc.ac.id", "nidn_nip": "0412028801" },
    "gender": { "laki": 5, "perempuan": 5, "unknown": 0 },
    "prodi": [ { "nama": "Teknik Informatika", "jumlah": 3 } ],
    "anggota": [
      { "peserta_id": 1, "user_id": 51, "nim": "210411001", "nama": "Andi Pratama", "email": "210411001@student.umc.ac.id", "semester": 7, "nomor_hp": "081234567890", "jenis_kelamin": "Laki-laki", "fakultas": "FT", "prodi": "S1 Teknik Informatika", "status": "VERIFIED" }
    ],
    "dokumen": [
      { "id": 1, "document_type": "PROPOSAL_PROGRAM_KERJA", "title": "proposal.pdf", "file_size": 102400, "mime_type": "application/pdf", "uploaded_at": "2026-10-14T00:00:00.000Z", "uploaded_by": "Admin LPPM", "url": "https://xxx.supabase.co/storage/v1/object/public/lppm_documents/kkm-kelompok/1/..." }
    ]
  }
}
```

### Cara Tes (pakai seed)

- Login `admin@lppm.ac.id / Admin@12345`, periode demo `id=2` (30 desa + 30 kelompok, semua kosong → status BERMASALAH).
- Assign peserta: Edit → Tambah Mahasiswa (peserta `BelumDitempatkan`), atau `POST /kkm/kelompok/1/anggota {"peserta_ids":[1,2,3]}`.
- Lihat status berubah mengikuti kuota: 5/10 → 50% BELUM_LENGKAP, 8/10 → 80% AKTIF, 4/10 → 40% BERMASALAH.
- Upload dokumen via curl: `-F "document_type=PROPOSAL_PROGRAM_KERJA" -F "file=@proposal.pdf;type=application/pdf"`.

### Catatan untuk FE

- Jangan hardcode status/komposisi — selalu pakai nilai dari BE (derived).
- `dpl` bisa `null` → tampilkan "Belum ada DPL" + tombol Assign.
- Periode `SELESAI` → mutations ditolak `400` → disable tombol edit/dokumen/anggota kalau `periode.status === "SELESAI"`.
- Pie chart & progress boleh pakai lib yang sudah ada (recharts dll) — data sudah siap pakai.
- Cetak = `window.print()` + `@media print` (hide navbar/sidebar), tidak ada endpoint PDF.
- Ikuti pattern FE yang sudah ada (axios, React Query, Tailwind).

Kerjakan dengan clean code.
