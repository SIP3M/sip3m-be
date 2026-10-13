import { z } from "zod";

export const kkmGenerateStatsQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
});

export const kkmGenerateConfigSchema = z.object({
  periode_id: z.coerce.number().int().positive({ message: "periode_id wajib." }),
  jumlah_anggota_per_kelompok: z.coerce.number().int().min(1).max(50).default(10),
  pola_prodi: z.enum(["CAMPUR", "MIN_3_PRODI", "FAKULTAS", "RANDOM"]).default("CAMPUR"),
  gender_balance: z.coerce.boolean().optional().default(false),
  lokasi_mode: z.enum(["RANDOM", "KUOTA"]).default("RANDOM"),
  assign_dpl_otomatis: z.coerce.boolean().optional().default(false),
  metode_dpl: z.enum(["RANDOM", "FAKULTAS", "BEBAN_SEIMBANG"]).default("RANDOM").optional(),
  maks_kelompok_per_dpl: z.coerce.number().int().min(1).max(20).optional(),
  ikuti_kuota_desa: z.coerce.boolean().optional().default(true),
});

export type KkmGenerateConfig = z.infer<typeof kkmGenerateConfigSchema>;
export type KkmGenerateStatsQuery = z.infer<typeof kkmGenerateStatsQuerySchema>;
