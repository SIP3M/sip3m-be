import { z } from "zod";

const komponenScoreSchema = z
  .coerce.number()
  .min(0, "Nilai minimal 0.")
  .max(100, "Nilai maksimal 100.");

export const upsertPenilaianSchema = z.object({
  peserta_id: z.coerce.number().int().positive("ID peserta tidak valid."),
  kehadiran: komponenScoreSchema.default(0),
  keaktifan: komponenScoreSchema.default(0),
  logbook: komponenScoreSchema.default(0),
  program_kerja: komponenScoreSchema.default(0),
  laporan: komponenScoreSchema.default(0),
  sikap: komponenScoreSchema.default(0),
  catatan_dpl: z.string().trim().max(2000, "Catatan maksimal 2000 karakter.").optional().nullable(),
});

export const bulkUpsertPenilaianSchema = z.object({
  penilaian_list: z.array(upsertPenilaianSchema).min(1, "Minimal satu data penilaian."),
});

export type UpsertPenilaianInput = z.infer<typeof upsertPenilaianSchema>;
export type BulkUpsertPenilaianInput = z.infer<typeof bulkUpsertPenilaianSchema>;
