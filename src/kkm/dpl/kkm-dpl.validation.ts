import { z } from "zod";

export const kkmDplListQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  search: z.string().trim().optional(),
  fakultas: z.string().trim().optional(),
  status: z.enum(["Aktif", "Belum Ditugaskan"]).optional(),
});

export const kkmDplStatsQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
});

export const kkmDplDosenQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const kkmDplKelompokQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
  unassigned_only: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  search: z.string().trim().optional(),
});

export const kkmDplAssignSchema = z.object({
  dosen_id: z.coerce.number().int().positive({ message: "dosen_id wajib." }),
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
  kelompok_ids: z.array(z.coerce.number().int().positive()).min(1, "Minimal 1 kelompok."),
  maksimal_kelompok: z.coerce
    .number()
    .int()
    .min(1, "Maksimal kelompok minimal 1.")
    .max(20, "Maksimal kelompok maksimal 20."),
});

export const kkmDplCabutSchema = z.object({
  dosen_id: z.coerce.number().int().positive({ message: "dosen_id wajib." }),
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
});

export const kkmKelompokGenerateSchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
});

export type KkmDplListQuery = z.infer<typeof kkmDplListQuerySchema>;
export type KkmDplAssignInput = z.infer<typeof kkmDplAssignSchema>;
export type KkmDplCabutInput = z.infer<typeof kkmDplCabutSchema>;
