import { z } from "zod";
import { JenisKkm } from "../../generated/prisma/enums";

// Query portal skema — semua opsional (filter ringan, kartu sedikit).
export const kkmSkemaPortalQuerySchema = z.object({
  jenis: z.nativeEnum(JenisKkm).optional(),
  wilayah: z.string().trim().optional(), // kabupaten (case-insensitive)
});

export type KkmSkemaPortalQuery = z.infer<typeof kkmSkemaPortalQuerySchema>;
