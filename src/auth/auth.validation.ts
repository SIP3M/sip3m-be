import { z } from "zod";

export const registerDosenSchema = z
  .object({
    // step 1
    name: z
      .string()
      .min(3, "Nama lengkap minimal 3 karakter")
      .max(100, "Nama lengkap hanya boleh maksimal 100 karakter."),
    tempat_lahir: z
      .string()
      .min(1, "Tempat lahir wajib diisi.")
      .max(100, "Tempat lahir hanya boleh maksimal 100 karakter."),
    tanggal_lahir: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message:
        "Tanggal lahir harus berupa tanggal yang valid (gunakan YYYY-MM-DD).",
    }),
    jenis_kelamin: z.enum(["Laki-laki", "Perempuan"], {
      error: 'Jenis kelamin harus "Laki-laki" atau "Perempuan".',
    }),
    alamat: z
      .string()
      .max(500, "Alamat hanya boleh maksimal 500 karakter.")
      .optional(),
    nomor_hp: z
      .string()
      .min(1, "Nomor HP wajib diisi.")
      .max(20, "Nomor HP hanya bisa maksimal 20 characters."),
    email: z
      .string()
      .min(1, "Email wajib diisi.")
      .email("Email format tidak valid."),

    // step 2
    nidn: z
      .string()
      .min(1, "NIDN wajib diisi.")
      .max(20, "NIDN hanya boleh maksimal 20 karakter."),
    fakultas: z
      .string()
      .min(1, "Fakultas wajib diisi.")
      .max(100, "Fakultas hanya boleh maksimal 100 karakter."),
    program_studi: z
      .string()
      .min(1, "Program studi wajib diisi.")
      .max(100, "Program studi hanya boleh maksimal 100 karakter."),

    // step 3
    username: z
      .string()
      .min(3, "Username minimal 3 karakter.")
      .max(30, "Username hanya boleh maksimal 30 karakter.")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username hanya boleh mengandung huruf, angka, dan underscore.",
      ),
    password: z
      .string()
      .min(1, "Password wajib diisi.")
      .min(8, "Password harus minimal 8 karakter.")
      .max(100, "Password hanya boleh maksimal 100 karakter."),
    konfirmasi_password: z
      .string()
      .min(1, "Konfirmasi password wajib diisi.")
      .min(8, "Konfirmasi password harus minimal 8 karakter.")
      .max(100, "Konfirmasi password hanya boleh maksimal 100 karakter."),
  })
  .refine((data) => data.password === data.konfirmasi_password, {
    message: "Password dan konfirmasi password harus sama.",
    path: ["konfirmasi_password"],
  });

export const registerReviewerSchema = z
  .object({
    name: z
      .string()
      .min(3, "Nama lengkap minimal 3 karakter")
      .max(100, "Nama lengkap hanya boleh maksimal 100 karakter."),
    email: z
      .string()
      .min(1, "Email wajib diisi.")
      .email("Email format tidak valid."),
    nomor_hp: z
      .string()
      .min(1, "Nomor HP wajib diisi.")
      .max(20, "Nomor HP hanya bisa maksimal 20 characters."),
    instansi: z
      .string()
      .min(1, "Instansi wajib diisi.")
      .max(100, "Instansi hanya boleh maksimal 100 karakter."),
    bidang_keahlian: z
      .string()
      .min(1, "Bidang keahlian wajib diisi.")
      .max(100, "Bidang keahlian hanya boleh maksimal 100 karakter."),
    pengalaman_review: z
      .string()
      .min(1, "Pengalaman review wajib diisi.")
      .max(1000, "Pengalaman review hanya boleh maksimal 1000 karakter."),
    cv_path: z
      .string()
      .min(1, "CV wajib diunggah.")
      .max(255, "Path CV hanya boleh maksimal 255 karakter."),
    username: z
      .string()
      .min(3, "Username minimal 3 karakter.")
      .max(30, "Username hanya boleh maksimal 30 karakter.")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username hanya boleh mengandung huruf, angka, dan underscore.",
      ),
    password: z
      .string()
      .min(1, "Password wajib diisi.")
      .min(8, "Password harus minimal 8 karakter.")
      .max(100, "Password hanya boleh maksimal 100 karakter."),
    konfirmasi_password: z
      .string()
      .min(1, "Konfirmasi password wajib diisi.")
      .min(8, "Konfirmasi password harus minimal 8 karakter.")
      .max(100, "Konfirmasi password hanya boleh maksimal 100 karakter."),
  })
  .refine((data) => data.password === data.konfirmasi_password, {
    message: "Password dan konfirmasi password harus sama.",
    path: ["konfirmasi_password"],
  });

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email / NIDN / NIP wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
  remember_me: z.boolean().optional(),
});
