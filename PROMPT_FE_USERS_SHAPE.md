# PROMPT FE — Normalisasi Field `fakultas` & `program_studi` (Manajemen Pengguna)

> **Untuk AI / Developer Frontend.** Backend sudah mengubah bentuk (shape) data
> `fakultas` dan `program_studi` pada **semua endpoint Manajemen Pengguna** menjadi
> seragam: `{ id, nama } | null`. Bacalah dokumen ini penuh sebelum mengubah kode FE.

---

## 1. Kenapa ini ada? (Konteks bug)

Sebelumnya FE error crash:

```
Minified React error #31 → "Objects are not valid as a React child"
(object with keys {id, nama})
```

Penyebab: FE me-render field `fakultas` **langsung sebagai teks**, padahal BE
mengembalikan **object** `{ id, nama }`. Ditambah, bentuk data tidak konsisten:
`program_studi` kadang berupa **angka (id)** di detail, kadang **object** di
endpoint lain. Untuk memperbaiki akar masalahnya, BE menormalkan semua respons
users menjadi format tunggal yang konsisten.

---

## 2. Bentuk data BARU (SUDAH BERLAKU di Backend)

Untuk **semua** endpoint users di bawah, field `fakultas` dan `program_studi`
selalu berbentuk:

```ts
type Ref = { id: number; nama: string } | null;
```

Contoh respons nyata:

```jsonc
// GET /api/users/236  (mahasiswa — punya fakultas & prodi)
{
  "data": {
    "id": 236,
    "name": "Zahra Pratama 4",
    "nidn": "210411200",
    "fakultas":      { "id": 3,  "nama": "Fakultas Keguruan dan Ilmu Pendidikan" },
    "program_studi": { "id": 11, "nama": "S1 Pendidikan IPA" }
  }
}

// GET /api/users/437  (reviewer eksternal — tanpa fakultas & prodi)
{
  "data": {
    "fakultas":      null,
    "program_studi": null
  }
}
```

### Endpoint yang berubah (wajib dicek FE-nya)

| Method & Path | `fakultas` | `program_studi` | Catatan |
|---|---|---|---|
| `GET  /api/users` (list, paginated) | `{id,nama}\|null` | `{id,nama}\|null` | `program_studi` = **field BARU** di list |
| `GET  /api/users/:id` (detail) | `{id,nama}\|null` | `{id,nama}\|null` | `program_studi` **dulu angka, sekarang object** |
| `POST /api/users` (create) | `{id,nama}\|null` | `{id,nama}\|null` | `program_studi` ikut di-respons |
| `PUT  /api/users/:id` (update) | `{id,nama}\|null` | `{id,nama}\|null` | `program_studi` ikut di-respons |
| `PATCH /api/users/:id/role` | `{id,nama}\|null` | *(tidak ada)* | response ringkas |
| `PATCH /api/users/:id/status` | `{id,nama}\|null` | *(tidak ada)* | response ringkas |

> **Belum berubah (hati-hati, masih bentuk LAMA):** endpoint `POST /auth/login`,
> `GET /auth/me`, dan `GET /dosen/profile` **BELUM dinormalisasi** — mereka masih
> mengembalikan `fakultas` lama (angka id / string). Jangan asumsikan semua
> `fakultas` di seluruh aplikasi sudah `{id,nama}`. Hanya endpoint **users** di
> tabel atas yang sudah pasti `{id,nama}`.

---

## 3. Yang HARUS diubah di FE

### 3.1 Definisikan tipe data

```ts
type Ref = { id: number; nama: string } | null;

interface UserListItem {
  id: number;
  name: string;
  email: string;
  nidn: string | null;
  fakultas: Ref;
  program_studi: Ref;      // baru di list
  is_active: boolean;
  created_at: string;
  roles: { id: number; roles: string };
}

interface UserDetail {
  // ...field lain...
  fakultas: Ref;
  program_studi: Ref;
}
```

### 3.2 Render data (INI penyebab crash #31 — wajib diperbaiki)

```tsx
// ❌ SALAH — akan crash (React error #31)
<span>{user.fakultas}</span>
<span>{user.program_studi}</span>

// ❌ SALAH — crash jika null
<span>{user.fakultas.nama}</span>

// ✅ BENAR — null-safe
<span>{user.fakultas?.nama ?? "-"}</span>
<span>{user.program_studi?.nama ?? "-"}</span>
```

Berlaku juga untuk: tabel list, halaman **Detail**, kartu profil, dropdown label,
search result, dll. **Setiap** tempat yang menampilkan `fakultas` / `program_studi`
harus pakai `?.nama ?? "-"`.

### 3.3 Form Tambah / Edit (input ke BE = **ID dalam bentuk string**)

Input create/update ke BE **tidak berubah**: kirim **ID fakultas & ID prodi**
sebagai **string angka**.

```tsx
// Prefill form Edit dari data user (pakai .id, bukan objeknya)
setValue("fakultas",      user.fakultas      ? String(user.fakultas.id) : "");
setValue("program_studi", user.program_studi ? String(user.program_studi.id) : "");

// Submit ke BE
await api.put(`/users/${id}`, {
  fakultas: "1",            // <- ID sebagai string, BUKAN "Fakultas Teknik"
  program_studi: "4",       // <- ID sebagai string
});
```

Dropdown tetap pakai **master fakultas/prodi** (value = `id`, label = `nama`):

```tsx
<select value={watch("fakultas") ?? ""} {...register("fakultas")}>
  <option value="">Pilih Fakultas</option>
  {masterFakultas.map((f) => (
    <option key={f.id} value={String(f.id)}>{f.nama}</option>
  ))}
</select>
```

### 3.4 Perbandingan nilai (selected state)

```tsx
// ❌ SALAH
const isSelected = selectedFakId === user.fakultas;

// ✅ BENAR
const isSelected = Number(selectedFakId) === user.fakultas?.id;
```

---

## 4. Checklist QA untuk FE

- [ ] Buka **Daftar Manajemen Pengguna** → tidak ada layar merah / crash.
- [ ] Buka **Detail** user yang **punya** fakultas → tampil nama fakultas & prodi.
- [ ] Buka **Detail** user yang **tidak punya** fakultas (mis. reviewer eksternal) → tampil `-` / placeholder, **tidak crash**.
- [ ] Kolom list menampilkan nama fakultas (bukan `[object Object]`).
- [ ] **Edit** user → dropdown fakultas & prodi sudah ter-prefill benar.
- [ ] **Simpan Edit** dengan fakultas/prodi terpilih → sukses (kirim ID string).
- [ ] **Tambah** user baru dengan fakultas/prodi → sukses.
- [ ] Toggle **status** & ubah **role** user → sukses, respons tetap `{id,nama}`.

---

## 5. Ringkasan aturan utama (hafalkan ini)

1. `fakultas` & `program_studi` di endpoint **users** = **`{ id, nama } | null`**.
2. Selalu render **`fakultas?.nama ?? "-"`** — jangan pernah render object langsung.
3. Kirim ke BE (create/update) tetap **ID string**: `fakultas: "1"`.
4. `?.` (optional chaining) wajib karena bisa `null`.
5. `/auth/me`, `/auth/login`, `/dosen/profile` **belum** `{id,nama}` — jangan ikut diasumsikan.
