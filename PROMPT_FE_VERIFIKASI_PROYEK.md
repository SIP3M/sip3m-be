# PROMPT FE — Verifikasi Alur Proyek Pengabdian (Laporan Akhir = Syarat "Selesai")

> **Untuk AI / Developer Frontend.** Backend sudah memperbaiki bug di mana proyek
> pengabdian dianggap **SELESAI terlalu cepat** (setelah *Laporan Kemajuan 2*,
> tanpa menunggu *Laporan Akhir*). Bacalah dokumen ini penuh. **Ringkasnya: FE
> tidak wajib mengubah kode** — hanya perlu QA (verifikasi) dan (opsional)
> membersihkan placeholder dummy di dashboard.

---

## 1. Konteks bug (di Backend)

Sebelum diperbaiki, backend menentukan status proyek dengan **hardcode sequence**
milestone (asumsi 0-based), padahal data milestone di DB memakai **1-based**:

```
sequence 1: Tanda Tangan Kontrak        (target 0%)
sequence 2: Laporan Kemajuan 1          (target 30%)
sequence 3: Laporan Kemajuan 2          (target 70%)
sequence 4: Laporan Akhir               (target 100%)
```

Karena hardcode-nya salah, "Laporan Kemajuan 2" (sequence 3) dianggap milestone
terakhir → proyek langsung `SELESAI` + `overall_progress: 100` **sebelum**
Laporan Akhir diunggah/di-approve.

**Perbaikan di backend:**
- Status proyek kini **dinamis**: `SELESAI` hanya terjadi ketika milestone yang
  di-approve benar-benar **terakhir** (tidak ada sequence lebih besar).
- `overall_progress` diambil dari `target_percentage` milestone
  (0 / 30 / 70 / 100), bukan dari angka sequence yang di-hardcode.
- Proyek masih `PENDING` → otomatis jadi `SEDANG_BERJALAN` + `start_date` saat
  milestone pertama disetujui.
- Sequence milestone diseragamkan ke **1-based**.

> **Konsekuensi ke FE:** proyek kini tetap berstatus **Aktif** (dan tombol upload
> Laporan Akhir tetap muncul) sampai Laporan Akhir benar-benar disetujui.

---

## 2. Apakah FE perlu mengubah kode? — **TIDAK (sudah dinamis)**

Setelah diperiksa, semua tampilan terkait proyek di FE **sudah membaca data dari
API** (bukan menghitung sendiri / hardcode sequence):

| File FE | Cara kerja | Perlu ubah? |
|---|---|---|
| `src/features/projects/ProjectDosen.tsx` | sort `a.sequence-b.sequence`; `ongoingMilestone = find(m => m.status !== "COMPLETED")`; progress dari `target_percentage`; upload menerima milestone dari tombol yang diklik | ❌ Tidak |
| `src/features/laporan/Laporan.tsx` | sort by sequence; `activeMilestone = find(status !== "COMPLETED")` | ❌ Tidak |
| `src/features/projects/ProjectDetail.tsx` | render `milestone.sequence / title / target_percentage / status` langsung dari API | ❌ Tidak |
| `src/features/projects/ProjectList.tsx` | filter & label dari string `status` | ❌ Tidak |
| `src/features/projects/project.types.ts` | tipe saja (`sequence`, `target_percentage`, `overall_progress`) | ❌ Tidak |

Karena FE hanya *mencerminkan* `status` & `overall_progress` dari API, perbaikan
backend bersifat **transparan**: setelah BE di-deploy, FE otomatis benar tanpa
ubaahan kode.

---

## 3. QA / Verifikasi (wajib dilakukan setelah BE di-deploy)

Tujuan: memastikan proyek **tidak** lagi dianggap Selesai sebelum Laporan Akhir.

### Skenario bahagia (alur normal)
1. Login sebagai **dosen** → buka menu **Proyek Saya** (`ProjectDosen.tsx`).
2. Pilih proyek berstatus **PENDING / Sedang Berjalan**.
3. Setujui/unggah **Laporan Kemajuan 1** (sequence 2) →
   ✅ `overall_progress` ≈ **30%**, status masih **Sedang Berjalan**.
4. Setujui/unggah **Laporan Kemajuan 2** (sequence 3) →
   ✅ `overall_progress` ≈ **70%**, status **MASIH Sedang Berjalan** (bukan Selesai!),
   tombol upload **Laporan Akhir** masih tersedia.
5. Setujui/unggah **Laporan Akhir** (sequence 4) →
   ✅ `overall_progress` = **100%**, baru status berubah **Selesai**, `end_date` terisi.

### Cek tambahan
- **Proyek aktif tetap di daftar aktif** sampai Laporan Akhir selesai
  (`activeProjects` di `ProjectDosen.tsx` memfilter `!isCompletedStatus(p.status)`).
- **Progress bar** (`ProjectDosen.tsx`) menampilkan % dari `overall_progress`
  yang kini akurat (0 → 30 → 70 → 100).
- **Halaman Laporan** (`Laporan.tsx`): proyek tetap muncul sebagai "ada milestone
  tertunda" sampai semua milestone COMPLETED.

### Contoh respons API yang diharapkan (setelah Laporan Kemajuan 2 disetujui)
```jsonc
// GET /api/pengabdian/projects (milestones disertakan)
{
  "status": "SEDANG_BERJALAN",      // ← BUKAN "SELESAI"
  "overall_progress": 70,           // ← dari target_percentage milestone
  "milestones": [
    { "sequence": 1, "title": "Tanda Tangan Kontrak", "target_percentage": 0,   "status": "COMPLETED" },
    { "sequence": 2, "title": "Laporan Kemajuan 1",   "target_percentage": 30,  "status": "COMPLETED" },
    { "sequence": 3, "title": "Laporan Kemajuan 2",   "target_percentage": 70,  "status": "COMPLETED" },
    { "sequence": 4, "title": "Laporan Akhir",        "target_percentage": 100, "status": "ONGOING" }
  ]
}
```

---

## 4. (Opsional) Bersihkan placeholder dummy di Dashboard Dosen

**Ini di luar bug di atas**, tapi layak dibereskan. File
`src/features/dashboard/DosenDashboard.tsx` (sekitar baris 180-223) berisi
**konten dummy statik yang di-hardcode**, bukan dari API:

- Judul proyek karangan: `"Analisis Dampak Lingkungan"`, `"Implementasi Smart Village"`.
- Persentase fixed: `style={{ width: "75%" }}` dan `width: "30%"`.
- Teks `Next: Laporan Kemajuan 2` dan `Next: Survey Lapangan` di-hardcode.
- Label `ON TRACK` / `DELAYED` juga hardcode.

Kalau dashboard ini ditujukan sungguhan untuk dosen, ganti blok tersebut agar
mengambil data dari endpoint proyek (mis. `getPengabdianProjects`) lalu tampilkan
`project.title`, `project.overall_progress`, dan milestone berikutnya secara
dinamis — pola sort/milestone-nya bisa ditiru dari `ProjectDosen.tsx`.
Kalau hanya placeholder sementara, **biarkan saja** (tidak memengaruhi alur proyek).

---

## 5. Catatan tambahan

- **Data lama yang sudah keburu "Selesai" prematur** (proyek tertentu yang sudah
  ada di DB sebelum fix) **tidak dimigrasikan** (keputusan: perbaikan kode ke
  depan saja). Proyek-proyek itu akan tetap tampil "Selesai" di FE. Jika suatu
  saat ingin dirapikan, itu lewat **perbaikan data di backend** (di luar scope FE).
- **Judul milestone** di API kini benar: sequence 3 = **"Laporan Kemajuan 2"**
  (sebelumnya ada typo "Laporan Kemajuan 3" di sebagian data lama — abaikan jika
  masih muncul pada proyek lama).

---

## Aturan
- **Jangan** menghitung status/progres milestone di sisi FE berdasarkan angka
  `sequence` yang di-hardcode. Selalu gunakan `status`, `target_percentage`, dan
  `overall_progress` dari API.
- **Jangan** mengubah `ProjectDosen.tsx` / `Laporan.tsx` / `ProjectDetail.tsx`
  untuk alur ini — sudah benar.
- Yang perlu dilakukan: **QA poin 3** (wajib) + **pembersihan dashboard (opsional)**.
