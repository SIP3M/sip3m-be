import { z } from "zod";

const text100 = (label: string) =>
  z
    .string({ message: `${label} wajib diisi.` })
    .trim()
    .min(2, `${label} minimal 2 karakter.`)
    .max(100, `${label} maksimal 100 karakter.`);

export const createKkmLocationSchema = z.object({
  periode_id: z.coerce
    .number({ message: "periode_id wajib diisi." })
    .int("periode_id harus bilangan bulat.")
    .positive("periode_id tidak valid."),
  kabupaten: text100("Kabupaten"),
  kecamatan: text100("Kecamatan"),
  desa: text100("Desa"),
  kuota: z.coerce
    .number({ message: "Kuota wajib diisi." })
    .int("Kuota harus bilangan bulat.")
    .min(1, "Kuota minimal 1.")
    .max(1000, "Kuota maksimal 1000."),
});

export const updateKkmLocationSchema = z.object({
  kabupaten: text100("Kabupaten").optional(),
  kecamatan: text100("Kecamatan").optional(),
  desa: text100("Desa").optional(),
  kuota: z.coerce.number().int().min(1).max(1000).optional(),
});

export const kkmLocationQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  search: z.string().trim().optional(),
  kecamatan: z.string().trim().optional(),
  kabupaten: z.string().trim().optional(),
  status: z.enum(["Tersedia", "Penuh"]).optional(),
});

export const kkmLocationIdParamSchema = z.object({
  id: z.coerce.number().int().positive("ID lokasi tidak valid."),
});

export type CreateKkmLocationInput = z.infer<typeof createKkmLocationSchema>;
export type UpdateKkmLocationInput = z.infer<typeof updateKkmLocationSchema>;
export type KkmLocationQueryInput = z.infer<typeof kkmLocationQuerySchema>;
