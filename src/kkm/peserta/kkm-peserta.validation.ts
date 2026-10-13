import { z } from "zod";
import { KkmPesertaStatus } from "../../generated/prisma/enums";

export const kkmPesertaStatsQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
});

export const kkmPesertaQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
  page: z.coerce.number().int().min(1).default(1).optional(),
  search: z.string().trim().optional(),
  fakultas: z.string().trim().optional(),
  prodi: z.string().trim().optional(),
  semester: z.coerce.number().int().min(1).max(14).optional(),
  kelompok_id: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(KkmPesertaStatus).optional(),
  status_kelompok: z.enum(["BelumDitempatkan", "SudahDitempatkan"]).optional(),
});

export const kkmPesertaBulkStatusSchema = z.object({
  periode_id: z.coerce.number().int().positive(),
  peserta_ids: z.array(z.coerce.number().int().positive()).min(1, "Minimal 1 peserta."),
  status: z.nativeEnum(KkmPesertaStatus),
});

export const kkmPesertaAssignKelompokSchema = z.object({
  peserta_ids: z.array(z.coerce.number().int().positive()).min(1, "Minimal 1 peserta."),
  kelompok_id: z.coerce.number().int().positive({ message: "kelompok_id wajib." }),
});

export const kkmPesertaUpdateStatusSchema = z.object({
  status: z.nativeEnum(KkmPesertaStatus),
});

export type KkmPesertaQuery = z.infer<typeof kkmPesertaQuerySchema>;
export type KkmPesertaBulkStatusInput = z.infer<typeof kkmPesertaBulkStatusSchema>;
export type KkmPesertaAssignKelompokInput = z.infer<typeof kkmPesertaAssignKelompokSchema>;
