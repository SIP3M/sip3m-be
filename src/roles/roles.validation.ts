import { z } from "zod";

export const createRoleSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama role minimal 3 karakter.")
    .max(50, "Nama role maksimal 50 karakter.")
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Nama role huruf besar, angka, dan underscore saja (contoh: KETUA_LPPM).",
    ),
  deskripsi: z
    .string()
    .trim()
    .max(255, "Deskripsi maksimal 255 karakter.")
    .optional()
    .nullable(),
  // Salin izin dari role lain (opsional) — jadi template awal.
  salin_dari_role_id: z.number().int().positive().optional().nullable(),
  // Izin awal (opsional) — daftar kode permission.
  permissions: z.array(z.string().trim().min(1)).optional(),
});

export const updateRoleSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama role minimal 3 karakter.")
    .max(50, "Nama role maksimal 50 karakter.")
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Nama role huruf besar, angka, dan underscore saja (contoh: KETUA_LPPM).",
    )
    .optional(),
  deskripsi: z
    .string()
    .trim()
    .max(255, "Deskripsi maksimal 255 karakter.")
    .nullable()
    .optional(),
  dashboard_path: z
    .string()
    .trim()
    .max(100)
    .regex(/^\/[a-zA-Z0-9\-/:]*$/, "Dashboard path harus diawali /.")
    .nullable()
    .optional(),
});

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.string().trim().min(1)), // daftar kode permission (replace seluruh set)
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
