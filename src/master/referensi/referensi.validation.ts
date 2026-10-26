import { z } from "zod";

export const createReferensiSchema = z.object({
  nama: z
    .string({ message: "Nama wajib diisi." })
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(100, "Nama maksimal 100 karakter."),
  urut: z.coerce
    .number({ message: "Urutan harus berupa angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .max(999, "Urutan maksimal 999.")
    .optional(),
});

export const updateReferensiSchema = z.object({
  nama: z.string().trim().min(1, "Nama tidak boleh kosong.").max(100).optional(),
  is_aktif: z.boolean().optional(),
  urut: z.coerce
    .number({ message: "Urutan harus berupa angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .max(999, "Urutan maksimal 999.")
    .optional(),
});

export type CreateReferensiInput = z.infer<typeof createReferensiSchema>;
export type UpdateReferensiInput = z.infer<typeof updateReferensiSchema>;
