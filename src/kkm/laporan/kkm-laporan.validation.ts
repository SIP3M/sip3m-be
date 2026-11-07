import { z } from "zod";

/** Tidak ada body tambahan — unggahan laporan cukup berkas PDF (field: file). */
export const kkmLaporanUploadSchema = z.object({});

export type KkmLaporanUploadInput = z.infer<typeof kkmLaporanUploadSchema>;
