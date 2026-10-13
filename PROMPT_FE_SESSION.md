# PROMPT FE — Single-Session per Browser (Auth Opsi 2)

> Copy-paste prompt di bawah ke AI FE (Cursor / Claude / Codex / Gemini). Sudah disesuaikan dengan BE yang baru jadi di branch `auth-single-session`.

---

## PROMPT UNTUK AI FE

Kamu adalah Frontend Engineer untuk SIP3M (Sistem Informasi LPPM).

### Konteks BE

- Module **Auth Single-Session per Browser (Opsi 2)** sudah jadi di BE (branch `auth-single-session`, turunan `kkm-generate -> peserta-kkm -> kkm-dpl -> location-kkm -> periode-kkm`).
- Prinsip: **1 `UserSession` per `(user_id, device_id)`** (`@@unique([user_id, device_id])`). `device_id` = `X-Device-Id` dari FE (UUID per browser di `localStorage`), `jti` = UUID per login di JWT. BE `upsert` sesi per browser — login ulang di browser yang sama (`device_id` sama) → `jti` lama ke-`revoked_at` → token lama jadi `401`. Beda browser (`device_id` beda) → boleh bareng, **max 3 device** (device ke-4 revoke yang tertua). Jika FE tidak kirim `X-Device-Id`, BE fallback `ua-+User-Agent` (kurang akurat, Chrome normal vs Incognito jadi 1).
- Table `UserSession { id uuid, user_id FK users, jti unique, device_id VarChar 100, user_agent, ip, expires_at (1d / 7d remember_me), revoked_at nullable, createdAt/updatedAt }`, `prisma db push` done.
- Login lama **tetap jalan tanpa ubah FE** (backward compat, `if (decoded.jti)` baru cek) — tapi Opsi 2 jadi beneran per-browser hanya kalau FE kirim `X-Device-Id`.
- Base URL: `http://localhost:3000/api` (prod: `https://sip3m-be.vercel.app/api`)
- Auth: `Authorization: Bearer <JWT>` + `X-Device-Id: <uuid>` (FE generate sekali per browser)
- Swagger ada di `GET /docs` tag **Auth** (endpoint baru: `POST /auth/logout`, `GET /auth/sessions`, `DELETE/POST /auth/sessions/:deviceId`).
- RBAC: `POST /auth/login` public (rate 5/15m), `POST /auth/logout` + `GET /auth/sessions` + `DELETE /auth/sessions/:deviceId` = any login (`authMiddleware` dengan `jti` cek).

### Perubahan Minimal Wajib (5 baris)

Tanpa ini, login tetap 200 tapi **Single-Session per Browser jadi ngarang** (ketendangnya by User-Agent, bukan per browser).

**1. Generate `device_id` sekali per browser:**
```ts
// src/utils/device.ts (atau lib/device.ts)
export const getDeviceId = (): string => {
  let id = localStorage.getItem('device_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('device_id', id) }
  return id
}
// Panggil sekali saat app bootstrap biar siap:
// useEffect(() => { getDeviceId() }, [])
```

**2. Kirim `X-Device-Id` di setiap request (interceptor) + saat login:**
```ts
// src/lib/api.ts atau src/utils/axios.ts
import axios from 'axios'
import { getDeviceId } from './device'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Wajib untuk Opsi 2 per-browser
  config.headers['X-Device-Id'] = localStorage.getItem('device_id') || getDeviceId()
  return config
})

// Login — pastikan header juga ikut (atau cukup interceptor di atas)
export const login = (identifier: string, password: string, remember_me?: boolean) =>
  api.post('/auth/login', { identifier, password, remember_me }, {
    headers: { 'X-Device-Id': getDeviceId() },
  }).then(r => {
    localStorage.setItem('token', r.data.data.token)
    return r
  })
```

**3. Handle 401 global — sesi digantikan login baru di browser yang sama:**
```ts
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg: string = error.response?.data?.message || ''
    if (error.response?.status === 401 && msg.includes('Sesi di browser ini sudah digantikan')) {
      // Single-Session per Browser: token di browser ini sudah revoked karena login ulang di browser yang sama
      localStorage.removeItem('token')
      // Optional: toast.error('Sesi kamu di browser ini digantikan login baru. Silakan login ulang.')
      window.location.href = '/login?reason=session_replaced'
      return Promise.reject(error)
    }
    if (error.response?.status === 401) {
      // Token expire / invalid biasa
      // localStorage.removeItem('token'); window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Fitur Optional (Pro, Standar Industri)

Kalau sempat, bikin **Halaman `Sesi Aktif` / `Kelola Perangkat`** (route `/settings/sessions` atau `/profile/sessions`):

- Fetch: `GET /api/auth/sessions` (Bearer) → `{ message, data: [{ id, jti, device_id, user_agent, ip, expires_at, created_at }] }`
- Render list: `device_id` (pendek `abc-123...`), `user_agent` (parse jadi `Chrome Windows`), `ip`, `expires_at` (`2026-10-15 10:00`), `created_at`. Badge `Perangkat ini` jika `device_id === localStorage.device_id`.
- Tombol per row: `Cabut` → `DELETE /api/auth/sessions/:deviceId` atau `POST /api/auth/sessions/revoke { deviceId }` (Bearer). Toast sukses + refetch.
- Tombol `Logout` di header/navbar → `POST /api/auth/logout` (Bearer) → `localStorage.removeItem('token')` → redirect `/login`.
- Info: `Maksimal 3 perangkat aktif. Perangkat ke-4 akan menghapus yang tertua.`

### API Lengkap (prefix `/api`)

```
POST   /auth/login                         { identifier: "email / NIDN", password, remember_me?: boolean } + Header X-Device-Id: <uuid> → { message: "Login berhasil.", data: { token, user: { id, name, email, nidn, fakultas_id, roles } } }
POST   /auth/logout                        Bearer → { message: "Logout berhasil." } (revoke jti ini)
GET    /auth/me                            Bearer → { data: { id, name, email, roles, ... } }
GET    /auth/sessions                      Bearer → { message, data: [{ id, device_id, jti, user_agent, ip, expires_at, created_at }] }
DELETE /auth/sessions/:deviceId            Bearer → { message: "Sesi perangkat berhasil dicabut." }
POST   /auth/sessions/revoke               Bearer { deviceId } → sama dengan DELETE
```

**Example Login (FE harus kirim X-Device-Id):**
```http
POST /api/auth/login
X-Device-Id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ "identifier": "admin@umc.ac.id", "password": "P@ssw0rd123", "remember_me": false }
→ 200 { "message": "Login berhasil.", "data": { "token": "eyJhbG...jti...deviceId...", "user": { "id": 1, "roles": { "roles": "ADMIN_LPPM" } } } }
JWT payload: { sub: "1", userId: 1, role: "ADMIN_LPPM", jti: "uuid", deviceId: "550e..." , exp: 1d/7d }
```

**Example GET /auth/sessions:**
```http
GET /api/auth/sessions
Authorization: Bearer eyJhbG...
→ 200 { "message": "Berhasil mengambil sesi aktif.", "data": [
  { "id": "uuid-1", "device_id": "550e8400-...", "user_agent": "Mozilla/5.0 ... Chrome", "ip": "182.1.2.3", "expires_at": "2026-10-15T10:00:00.000Z", "created_at": "2026-10-14T10:00:00.000Z" },
  { "id": "uuid-2", "device_id": "6ba7b810-...", "user_agent": "Mozilla/5.0 ... Firefox", "ip": "182.1.2.3", "expires_at": "2026-10-15T10:01:00.000Z" }
] }
```

**Example 401 Sesi Digantikan:**
```http
GET /api/kkm/peserta?periode_id=2
Authorization: Bearer eyJ...jti-lama...
→ 401 { "message": "Sesi di browser ini sudah digantikan. Silakan login ulang." }
FE interceptor harus tangkap dan redirect /login.
```

### Aturan Bisnis (jangan dilanggar)

1. **Backward compat:** Token lama tanpa `jti` (sebelum branch ini) masih `200` sampai expire — middleware `if (decoded.jti)` baru cek. Jadi deploy aman tanpa force logout semua.
2. **Tanpa `X-Device-Id` tetap login 200**, tapi `device_id = ua-+UserAgent.slice(0,80)` → Incognito vs Normal Chrome dianggap 1 device. Selalu kirim `X-Device-Id` untuk Opsi 2 akurat.
3. **Max 3 device:** Device ke-4 login → BE revoke sesi tertua (by `created_at`). FE bisa tampilkan "3 perangkat aktif, yang tertua akan keluar".
4. **Logout revoke:** `POST /auth/logout` hanya revoke `jti` itu. `DELETE /auth/sessions/:deviceId` revoke 1 device. Tidak ada `revoke all` di FE — tapi BE punya `revokeAllUserSessions(userId)` untuk ganti password nanti.

### Error handling

- 401 `Sesi di browser ini sudah digantikan. Silakan login ulang.` → redirect `/login?reason=session_replaced`, toast, jangan loop retry.
- 401 `Invalid or expired authentication token.` → token expire / JWT_SECRET salah → redirect `/login`.
- 401 `Authorization header is missing.` → belum login.

### Catatan untuk FE

- Jangan generate `device_id` baru tiap login — harus `localStorage` persistent per browser. Baru tiap browser dapat UUID beda → Chrome + Firefox + HP = 3 `device_id` beda = 3 sesi.
- `getDeviceId()` harus jalan sebelum login pertama. Panggil di `App.tsx` `useEffect`.
- Simpan `token` di `localStorage` (sudah ada) — tidak perlu pindah ke `cookie`.
- Ikuti pattern FE yang sudah ada (axios/fetch, React Query, Tailwind, auth header). Skeleton untuk `/settings/sessions`.

Kerjakan dengan clean code.
