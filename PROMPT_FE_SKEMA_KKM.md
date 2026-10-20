# PROMPT FE — Portal Skema KKM (Kartu Pilihan)

> Handoff frontend untuk halaman **"Pilih Skema KKM"** (Portal Mahasiswa) ala desain kartu event. Backend siap di branch `feat/kkm-skema-portal`. **Jalur A** — 1 kartu = 1 Periode KKM (model KkmSkema menyusul).

## 1. Ringkasan Fitur

Halaman portal tempat mahasiswa melihat daftar KKM yang **terbuka pendaftarannya** sebagai kartu, lalu memilih. Backend hanya menyediakan **daftar kartu + stats** (tombol Daftar & form menyusul).

Endpoint utama: **`GET /api/kkm/skema`** — akses: `MAHASISWA` (admin/staff juga boleh untuk preview).

## 2. `GET /api/kkm/skema`

Query (semua opsional):
| Param | Tipe | Contoh | Keterangan |
|---|---|---|---|
| `jenis` | enum | `REGULER` \| `TEMATIK` | Filter tab |
| `wilayah` | string | `Cirebon` | Cocokkan **sebagian** kabupaten (case-insensitive) |

Respons 200:
```jsonc
{
  "message": "Berhasil mengambil daftar skema KKM.",
  "periode_aktif": { "id": 3, "nama_periode": "KKM TERBARU 2026", "tahun_akademik": "2026/2027", "jenis": "REGULER", "status": "AKTIF" },
  "skema": [
    {
      "id": 3,
      "nama": "KKM TERBARU 2026",
      "deskripsi": "Kuliah Kerja Mahasiswa reguler.",
      "jenis": "REGULER",
      "durasi_hari": 43,
      "tanggal": {
        "buka_daftar": "2026-10-15T00:00:00.000Z",
        "tutup_daftar": "2026-10-31T00:00:00.000Z",
        "pelaksanaan": "2026-11-02T00:00:00.000Z",
        "penarikan": "2026-12-15T00:00:00.000Z"
      },
      "kuota": 2000,
      "terisi": 183,
      "menunggu": 9,
      "sisa": 1817,
      "persentase_terisi": 9,
      "wilayah": ["Cirebon", "Indramayu", "Kuningan", "Majalengka"],
      "batas_daftar": "2026-10-31T00:00:00.000Z"
    }
  ],
  "stats": { "total_skema": 2, "akumulasi_kuota": 4000, "akumulasi_terisi": 183, "batas_akhir": "2026-10-31T00:00:00.000Z" },
  "filters": { "jenis": ["REGULER"], "wilayah": ["Cirebon", "Indramayu", "Kuningan", "Majalengka"] }
}
```

### Pemetaan ke desain
| Elemen desain | Field |
|---|---|
| Header label "Semester … 2026/2027" | `periode_aktif.tahun_akademik` |
| Kartu "Total Skema Terbuka" | `stats.total_skema` |
| Kartu "Akumulasi Kuota (358/500)" | `stats.akumulasi_terisi` / `stats.akumulasi_kuota` |
| Kartu "Batas Akhir … (Sisa 6 Hari)" | `stats.batas_akhir` (hitung sisa hari di FE) |
| Tab (Semua/Reguler/Tematik) | `filters.jenis` → `?jenis=` |
| Dropdown "Semua Wilayah" | `filters.wilayah` → `?wilayah=` |
| Judul kartu | `nama` |
| Deskripsi kartu | `deskripsi` |
| Badge jenis ("Reguler"/"Tematik") | `jenis` |
| "Durasi Pengabdian 40 Hari" | `durasi_hari` |
| "Lokasi Penempatan" | `wilayah` (array kabupaten, render ", ") |
| Bar "Sisa Kuota: N" + "N / M Terisi" | `sisa`, `terisi`, `kuota`, `persentase_terisi` |
| "Batas akhir pendaftaran" | `batas_daftar` / `tanggal.tutup_daftar` |
| Tombol "Daftar Skema Ini" | **belum ada** — lihat §5 |

## 3. Logika "Terbuka" (sudah di backend)
Kartu hanya berisi periode yang: status `AKTIF`/`DIJADWALKAN` **dan** masih dalam jendela `tgl_buka_daftar`→`tgl_tutup_daftar`. Jadi FE tidak perlu filter status/tanggal sendiri.

- `terisi` = peserta **VERIFIED** (mengisi kuota)
- `menunggu` = peserta **PENDING** (menunggu verifikasi; tampil sebagai info tambahan, opsional di kartu)
- `sisa` = `max(0, kuota - terisi)`; `persentase_terisi` = persen

## 4. Alur "Pilih Skema" (map ke desain — sebagian nanti)
Desain punya 4 langkah: **1 Pilih Skema → 2 Formulir & Lokasi → 3 Unggah Berkas → 4 Verifikasi Panitia**.
Ronde ini baru **langkah 1 (tampil kartu + tab/filter)**. Langkah 2-4 = tampilan nanti.

## 5. Yang BELUM ada (jangan diwujudkan dulu / tampil placeholder)
- **Tombol "Daftar"** → belum ada endpoint `POST` pendaftaran (menyusul).
- **Kartu "Prasyarat Akademik 112 SKS"** → belum ada (users tanpa field SKS). Sembunyikan / ganti kosong.
- **"Paling Diminati", badge status lain** → belum ada basis perhitungan.
- **Mitra Utama, Insentif, Kompetensi, Sertifikat, Fasilitas, Syarat Minimal/Lunas SPP** → belum ada field. Baris detail ini **di-skip**.
- **"Gelombang 1 Dibuka"** → tampilkan sebagai **"Pendaftaran Dibuka"** + `batas_daftar` (belum ada model gelombang).

## 6. Catatan Environment
- **Tanpa migrasi** (tidak ada perubahan schema ronde ini).
- Butuh beberapa Periode KKM **terbuka** agar kartu tampil banyak (1 periode = 1 kartu). Saat ini 2 periode terbuka (REGULER 2026 & KKM TERBARU 2026). Periode `SELESAI`/`DRAFT` tidak tampil.
- Contoh login uji mahasiswa: `210411010@student.umc.ac.id` / `Mahasiswa123!`.
