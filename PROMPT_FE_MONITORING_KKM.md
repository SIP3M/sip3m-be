# PROMPT FE — Monitoring KKM

> Handoff frontend untuk halaman **Monitoring KKM** (tabel progres + tahapan + indikator per kelompok, ala desain "Monitoring KKM"). Backend sudah siap di branch `feat/kkm-monitoring`.

## 1. Ringkasan Fitur

Halaman pemantauan KKM per periode. Menampilkan **5 kartu ringkasan**, **filter** (search, periode, desa, DPL), **tab status**, **tabel per-kelompok** (progres, tahapan, indikator, logbook + delta, DPL "terakhir"), dan **pagination**. Semua nilai turunan (status, progres, tahapan, indikator, delta) **dihitung di backend** — FE tinggal render.

Endpoint:
- `GET  /api/kkm/monitoring` — list + stats + opsi filter (ADMIN_LPPM & STAFF_LPPM)
- `GET  /api/kkm/kelompok/:id/logbook` — daftar entri logbook (mahasiswa anggota / DPL / admin / staff)
- `POST /api/kkm/kelompok/:id/logbook` — tambah entri logbook (hanya **mahasiswa anggota** / **DPL**)
- `POST /api/kkm/kelompok/:id/monitoring` — DPL tandai "sudah monitoring" (DPL / admin / staff)

## 2. `GET /api/kkm/monitoring`

Query (semua opsional):
| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `periode_id` | int | periode **AKTIF** | Kosongkan = periode berstatus AKTIF terbaru |
| `page` | int | 1 | Pagination |
| `search` | string | — | Cari nama kelompok / desa / kecamatan / DPL |
| `status` | enum | — | `AKTIF` \| `PERLU_PERHATIAN` \| `BERMASALAH` \| `SELESAI` |
| `desa` | string | — | Filter desa (persis, case-insensitive) |
| `dpl_id` | int | — | Filter DPL |

Respons 200:
```jsonc
{
  "message": "Berhasil mengambil monitoring KKM.",
  "periode": { "id": 3, "nama_periode": "KKM TERBARU 2026", "tahun_akademik": "2026/2027", "status": "AKTIF" },
  "data": [
    {
      "id": 32,
      "nama": "Kelompok 01",
      "jumlah_anggota": 6,
      "desa": "Karangmulya",
      "kecamatan": "Plumbon",
      "kabupaten": "Cirebon",
      "dpl": { "id": 4, "nama": "Dr. Ahmad Fauzi, M.Kom", "last_monitored_at": "2026-10-20T05:00:00.000Z", "terakhir": "Hari ini" },
      "logbook": { "jumlah": 5, "delta": 5 },
      "tahapan": "MONITORING_DPL",
      "tahapan_label": "Monitoring DPL",
      "progress": 5,
      "indikator": "NORMAL",
      "indikator_label": "Normal",
      "status": "AKTIF",
      "status_label": "Aktif"
    }
  ],
  "meta": { "totalData": 30, "totalPages": 3, "currentPage": 1, "limit": 12 },
  "stats": {
    "total_kelompok": 30,
    "kelompok_aktif": 1,
    "perlu_perhatian": 0,
    "bermasalah": 29,
    "selesai": 0,
    "rata_rata_progress": 0
  },
  "filters": {
    "desa": ["Astanajapura", "Karangmulya"],
    "dpl": [ { "id": 4, "nama": "Dr. Ahmad Fauzi, M.Kom" } ]
  }
}
```

Catatan respons:
- `periode` bisa `null` (belum ada periode aktif) → `data: []`, semua angka 0.
- `meta` mencerminkan hasil **setelah** filter (totalData = jumlah kelompok cocok).
- `stats` dihitung dari **seluruh** kelompok periode (di atas filter status/search) → pakai untuk tab & kartu.
- `filters` = opsi dropdown desa & DPL (dari seluruh kelompok).

### Pemetaan ke desain
| Elemen desain | Field |
|---|---|
| Kartu "Kelompok Aktif" | `stats.kelompok_aktif` |
| Kartu "Perlu Perhatian" | `stats.perlu_perhatian` |
| Kartu "Bermasalah" | `stats.bermasalah` |
| Kartu "Selesai" | `stats.selesai` |
| Kartu "Rata-rata Progress" | `stats.rata_rata_progress` |
| Tab (Semua/Aktif/…) | `stats.*` untuk jumlah; `?status=` untuk filter |
| Kolom KELOMPOK ("Kelompok 01", "10 anggota") | `nama`, `jumlah_anggota` |
| Kolom DESA | `desa` |
| Kolom DPL ("Dr. …, 3 hari lalu") | `dpl.nama`, `dpl.terakhir` (`null` = "Belum pernah") |
| Kolom LOGBOOK ("8 (-2)") | `logbook.jumlah`, `logbook.delta` (tampilkan `(+n)`/`(-n)`/kosong bila 0) |
| Kolom TAHAPAN | `tahapan` (+ `tahapan_label` siap tampil) |
| Kolom PROGRESS (bar %) | `progress` (0–100) |
| Kolom INDIKATOR | `indikator` (+ `indikator_label`) |
| Kolom STATUS (chip warna) | `status` (+ `status_label`) |
| "Menampilkan 6 dari 6 kelompok" | `meta.totalData` |

## 3. Nilai Turunan (definisi backend — untuk pemilihan warna/ikon)

**Status** (prioritas): `SELESAI` (progres 100) → `BERMASALAH` (tak ada entri logbook) → `PERLU_PERHATIAN` (DPL belum monitoring **atau** logbook < 5 entri) → `AKTIF`.
Saran warna: Aktif=hijau, Perlu Perhatian=kuning/amber, Bermasalah=merah, Selesai=biru/abu.

**Indikator** (prioritas): `NORMAL` → `TIDAK_ADA_AKTIVITAS` (0 entri) → `DPL_BELUM_MONITORING` (`last_monitored_at` null) → `LOGBOOK_KURANG` (<5 entri).

**Tahapan** (dokumen tertinggi): `MONITORING_DPL` (belum dokumen) → `PROGRAM_KERJA` (ada Proposal) → `LOGBOOK_AKTIF` (ada Logbook) → `LAPORAN_AKHIR` (ada Laporan Akhir) → `SELESAI` (progres 100).

**Progress** (0–100): Proposal +40, Logbook +30, Laporan Akhir +30, **bonus** entri logbook (max +10), cap 100.

**Delta** = entri 7 hari terakhir − entri 7 hari sebelumnya (bisa negatif).

## 4. Aksi Tulis (alur input)

### `POST /api/kkm/kelompok/:id/logbook` (mahasiswa anggota / DPL)
Body:
```json
{
  "tanggal": "2026-10-18",
  "judul": "Sosialisasi Program Kerja",
  "deskripsi": "Melaksanakan sosialisasi program kerja kepada warga desa.",
  "lokasi_kegiatan": "Balai Desa Karangmulya"
}
```
- `tanggal`, `judul`, `deskripsi` wajib; `lokasi_kegiatan` opsional.
- `201` sukses; `400` validasi; `403` bukan anggota/DPL; `404` kelompok tak ada.
- FE: form modal "Tambah Logbook" (mahasiswa/DPL). Setelah sukses → refresh tabel (progres/indikator/status kelompok itu otomatis naik).

### `POST /api/kkm/kelompok/:id/monitoring` (DPL / admin / staff)
Body opsional: `{ "catatan": "…catatan monitoring…" }` (`catatan` belum disimpan — hanya placeholder).
- `200` sukses (mengisi `last_monitored_at` = sekarang) → indikator "DPL Blm. Monitoring" hilang, `dpl.terakhir` jadi "Hari ini".
- FE: tombol "Tandai Monitoring" untuk DPL → refresh baris kelompok itu.

### `GET /api/kkm/kelompok/:id/logbook`
Mengembalikan array entri (terbaru dulu), tiap entri: `id, tanggal, judul, deskripsi, lokasi_kegiatan, created_at, penulis:{id,nama,nim_nip}`. Untuk modal detail logbook.

## 5. Otorisasi
- `GET /kkm/monitoring`: **ADMIN_LPPM, STAFF_LPPM** (403 untuk lainnya).
- `GET/POST .../logbook`: GET boleh semua role terkait; **POST hanya MAHASISWA anggota kelompok / DOSEN (DPL kelompok)** — admin/staff **tidak** boleh menulis entri.
- `POST .../monitoring`: **DOSEN (DPL kelompok), ADMIN_LPPM, STAFF_LPPM**.

## 6. Catatan Environment
- Butuh `prisma db push` (tabel baru `KkmLogbookEntry` + kolom `KkmKelompok.last_monitored_at`).
- Data awal: kelompok belum punya entri logbook → semua `BERMASALAH`/`TIDAK_ADA_AKTIVITAS`. Normal — akan membaik saat entri & monitoring mulai diisi.
