import { z } from "zod";

/** Upload logbook kelompok mingguan (ketua/sekretaris). */
export const kkmLogbookKelompokUploadSchema = z.object({
  minggu_ke: z.coerce
    .number({ message: "minggu_ke wajib diisi." })
    .int("minggu_ke harus bilangan bulat.")
    .min(1, "minggu_ke minimal 1."),
});

export type KkmLogbookKelompokUploadInput = z.infer<
  typeof kkmLogbookKelompokUploadSchema
>;
