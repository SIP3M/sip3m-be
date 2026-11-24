import { z } from "zod";

/**
 * Nama role TIDAK lagi dibatasi enum statis: role bisa ditambah/diubah lewat
 * CRUD Role oleh ADMIN_SISTEM (mis. KEUANGAN). Formatnya tetap disamakan dengan
 * aturan pembuatan role (huruf besar, angka, underscore) dan keberadaan role
 * divalidasi terhadap tabel `roles` di controller.
 */
const roleNameSchema = z
  .string()
  .trim()
  .min(1, "Role wajib dipilih")
  .max(50, "Nama role maksimal 50 karakter")
  .regex(
    /^[A-Za-z][A-Za-z0-9_]*$/,
    "Nama role hanya boleh berisi huruf, angka, dan underscore",
  )
  .transform((value) => value.toUpperCase());

/**
 * NIDN/NIP opsional. String kosong dianggap "tidak diisi" (bukan error), dan
 * pemisah yang lazim diketik pengguna (spasi, titik, strip) dibuang sebelum
 * dicek, sehingga "1987 6543" atau "1987.6543" tetap valid sebagai angka.
 */
const optionalNidnNipSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const cleaned = value.replace(/[\s.-]/g, "");
    return cleaned === "" ? undefined : cleaned;
  })
  .refine((value) => value === undefined || /^\d+$/.test(value), {
    message: "NIDN/NIP hanya boleh berisi angka",
  })
  .refine((value) => value === undefined || value.length <= 30, {
    message: "NIDN/NIP maksimal 30 karakter",
  });

export const updateUserRoleSchema = z.object({
  roles: roleNameSchema,
});

export const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
});

export const createUserSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email().max(100),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).max(100),
  roles: roleNameSchema,
  nidn_nip: optionalNidnNipSchema,
  fakultas: z.string().max(100).optional(),
  program_studi: z.string().max(100).optional(),
  tempat_lahir: z.string().max(100).optional(),
  tanggal_lahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  jenis_kelamin: z.string().max(15).optional(),
  alamat: z.string().optional(),
  nomor_hp: z
    .string()
    .regex(/^\d+$/, "Nomor HP hanya boleh berisi angka")
    .min(10)
    .max(15)
    .optional(),
  semester: z.coerce.number().int().min(1).max(14).optional(),
  is_active: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  email: z.string().email().max(100).optional(),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).max(100).optional(),
  roles: roleNameSchema.optional(),
  nidn_nip: optionalNidnNipSchema,
  fakultas: z.string().max(100).optional(),
  program_studi: z.string().max(100).optional(),
  tempat_lahir: z.string().max(100).optional(),
  // Edit: opsional — "" = hapus tanggal (null); tanpa field = tidak diubah.
  tanggal_lahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .or(z.literal(""))
    .optional(),
  jenis_kelamin: z.string().max(15).optional(),
  alamat: z.string().optional(),
  nomor_hp: z
    .string()
    .regex(/^\d+$/, "Nomor HP hanya boleh berisi angka")
    .min(10)
    .max(15)
    .optional(),
  semester: z.coerce.number().int().min(1).max(14).optional(),
  is_active: z.boolean().optional(),
});
