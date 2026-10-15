import { z } from "zod";

export const KkmKelompokStatusFilter = z.enum(["AKTIF", "BELUM_LENGKAP", "BERMASALAH"]);
export const KkmKomposisiFilter = z.enum(["SEIMBANG", "DOMINASI", "PERLU_PENYESUAIAN"]);

export const kkmKelompokStatsQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
});

export const kkmKelompokListQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
  page: z.coerce.number().int().min(1).default(1).optional(),
  search: z.string().trim().optional(),
  status: KkmKelompokStatusFilter.optional(),
  komposisi: KkmKomposisiFilter.optional(),
  desa: z.string().trim().optional(),
  dpl_id: z.coerce.number().int().positive().optional(),
});

export const kkmKelompokUpdateSchema = z.object({
  // Desa/lokasi TIDAK bisa diubah di sini (1 Desa = 1 Kelompok) — ganti desa lewat menu Lokasi KKM.
  dpl_id: z.coerce.number().int().positive().nullable().optional(),
});

export const kkmKelompokAddAnggotaSchema = z.object({
  peserta_ids: z.array(z.coerce.number().int().positive()).min(1, "Minimal 1 peserta."),
});

export const kkmKelompokDocTypeEnum = z.enum([
  "PROPOSAL_PROGRAM_KERJA",
  "LOGBOOK_KELOMPOK",
  "LAPORAN_AKHIR",
]);

export type KkmKelompokListQuery = z.infer<typeof kkmKelompokListQuerySchema>;
export type KkmKelompokUpdateInput = z.infer<typeof kkmKelompokUpdateSchema>;
export type KkmKelompokAddAnggotaInput = z.infer<typeof kkmKelompokAddAnggotaSchema>;
export type KkmKelompokDocType = z.infer<typeof kkmKelompokDocTypeEnum>;
