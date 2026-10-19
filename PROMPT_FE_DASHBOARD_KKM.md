# PROMPT FE — Dashboard KKM (`GET /api/dashboard/kkm`)

> **Untuk AI / Developer Frontend.** Backend sudah menambah **endpoint baru** untuk
> Dashboard KKM (monitoring pelaksanaan Kuliah Kerja Mahasiswa). Dokumen ini
> menjelaskan cara memanggil dan membaca responsnya.

---

## 1. Endpoint

```
GET /api/dashboard/kkm
```

- **Auth:** Bearer token.
- **Role yang diizinkan:** `ADMIN_LPPM`, `STAFF_LPPM` (lainnya 403).
- **Query (opsional):** `?periode_id=<int>`
  - Tanpa parameter → menampilkan periode berstatus **`AKTIF`**.
  - Dengan `periode_id` → menampilkan periode itu (404 jika tidak ada).
  - `periode_id` bukan angka → 400.
- Jika **tidak ada periode aktif**, field `periode` = `null` dan semua angka = 0
  (bukan error). FE sebaiknya tampilkan empty-state "Belum ada periode aktif".

---

## 2. Bentuk respons

```jsonc
{
  "message": "Dashboard KKM berhasil diambil.",
  "data": {
    "periode": {
      "id": 3,
      "nama_periode": "KKM TERBARU 2026",
      "tahun_akademik": "2026/2027",
      "status": "AKTIF"
    },
    "summary_cards": {
      "total_peserta": 200,          // Mahasiswa
      "total_kelompok": 30,          // Kelompok
      "total_desa": 30,              // Desa penempatan
      "total_dpl": 0,                // distinct DPL (dosen) pada kelompok
      "belum_dapat_kelompok": 20,    // peserta.kelompok_id = null
      "menunggu_verifikasi": 9       // peserta.status = PENDING
    },
    "peserta_per_prodi": [           // urut menurun, semua peserta
      { "nama": "S1 Teknik Informatika", "jumlah": 10 }
      // ...
    ],
    "status_kelompok": [             // hasil deriveStatus (isi vs kuota)
      { "status": "AKTIF",         "label": "Aktif",        "jumlah": 0 },
      { "status": "BELUM_LENGKAP", "label": "Belum Lengkap","jumlah": 30 },
      { "status": "BERMASALAH",    "label": "Bermasalah",   "jumlah": 0 }
    ],
    "distribusi_per_desa": [         // urut menurun, hanya peserta yg sudah punya kelompok
      { "nama": "Astanajapura", "jumlah": 6 }
      // ...
    ]
  }
}
```

---

## 3. Pemetaan ke desain Dashboard KKM

| Elemen desain | Field respons |
|---|---|
| Kartu "Total Peserta KKM" | `summary_cards.total_peserta` |
| Kartu "Total Kelompok" | `summary_cards.total_kelompok` |
| Kartu "Total Desa Penempatan" | `summary_cards.total_desa` |
| Kartu "Total DPL" | `summary_cards.total_dpl` |
| Kartu "Belum Mendapat Kelompok" | `summary_cards.belum_dapat_kelompok` |
| Kartu "Menunggu Verifikasi" | `summary_cards.menunggu_verifikasi` |
| Bar chart "Peserta Berdasarkan Program Studi" | `peserta_per_prodi` |
| Donut "Status Kelompok KKM" | `status_kelompok` |
| Bar "Distribusi Mahasiswa per Desa" | `distribusi_per_desa` |

---

## 4. Catatan untuk FE

- **Donut status kelompok** memakai definisi isi-vs-kuota (bukan lifecycle):
  - `AKTIF` ≥ 80% kuota · `BELUM_LENGKAP` 50–<80% · `BERMASALAH` < 50%.
  - Selalu ada **3 entri** (jumlah boleh 0) — jangan assume hanya yang >0 tampil.
- **`peserta_per_prodi`** diurutkan menurun. Untuk bar chart dengan banyak prodi,
  kelompokkan sisa jadi **"Lainnya"** di FE jika perlu (BE mengirim penuh).
- **`distribusi_per_desa`** hanya menghitung peserta yang **sudah punya kelompok**.
  Jadi jumlahnya ≤ `total_peserta` (sisanya = `belum_dapat_kelompok`).
- **Judul periode** untuk header dashboard: gunakan `data.periode.nama_periode`
  + `tahun_akademik` (atau empty-state bila `periode === null`).
- Untuk ganti periode (mis. dropdown), kirim ulang dengan `?periode_id=<id>`.

---

## 5. Aturan

- Jangan menghitung status/progres kelompok di sisi FE — gunakan `status_kelompok`.
- Jangan hardcode jumlah prodi/desa — render dari array.
- Selalu handle `periode === null` (belum ada periode aktif).
