import { z } from "zod";

export const createJabatanMasterSchema = z.object({
  nama: z.string().min(1).max(100),
  max_per_kelompok: z.number().int().positive().nullable().optional(),
});

export const updateJabatanMasterSchema = z.object({
  nama: z.string().min(1).max(100).optional(),
  max_per_kelompok: z.number().int().positive().nullable().optional(),
});

export type CreateJabatanMasterDTO = z.infer<typeof createJabatanMasterSchema>;
export type UpdateJabatanMasterDTO = z.infer<typeof updateJabatanMasterSchema>;
