import { z } from "zod";
import { UKURAN_JAKET } from "./kkm-pendaftaran.types";

// Boolean dari multipart selalu berupa string ("true"/"false") —
// z.coerce.boolean akan menganggap "false" = true, jadi parse manual.
const boolish = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((v) => v === true || v === "true");

export const upsertPendaftaranSchema = z.object({
  periode_id: z.coerce
    .number({ message: "Periode wajib dipilih." })
    .int("Periode tidak valid.")
    .positive("Periode tidak valid."),
  aksi: z.enum(["draft", "kirim"]).default("draft"),
  no_wa: z.string().trim().max(20, "Nomor WA maksimal 20 karakter.").optional(),
  ukuran_jaket: z
    .enum(UKURAN_JAKET, {
      message: "Ukuran jaket tidak valid. Pilihan: S, M, L, XL, XXL, XXXL.",
    })
    .optional(),
  nama_kontak_darurat: z
    .string()
    .trim()
    .max(100, "Nama kontak darurat maksimal 100 karakter.")
    .optional(),
  no_hp_kontak_darurat: z
    .string()
    .trim()
    .max(20, "Nomor HP kontak darurat maksimal 20 karakter.")
    .optional(),
  alamat_domisili: z
    .string()
    .trim()
    .max(500, "Alamat domisili maksimal 500 karakter.")
    .optional(),
  pernyataan: boolish.optional(),
});

export type UpsertPendaftaranInput = z.infer<typeof upsertPendaftaranSchema>;

export const listPendaftaranQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive().optional(),
});

export type ListPendaftaranQuery = z.infer<typeof listPendaftaranQuerySchema>;
