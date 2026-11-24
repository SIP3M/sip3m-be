import { z } from "zod";

/** Field multipart yang dikosongkan dari FE dikirim sebagai string kosong. */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** Batas kolom PostgreSQL INTEGER (INT4). */
const INT4_MAX = 2_147_483_647;

export const disburseProjectSchema = z.object({
  realized_amount: z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .pipe(
      z
        .number({ message: "realized_amount harus berupa angka." })
        .int("realized_amount harus bilangan bulat (rupiah tanpa sen).")
        .positive("realized_amount harus lebih dari 0.")
        .max(INT4_MAX, "Nominal melebihi batas maksimum yang dapat disimpan."),
    ),
  note: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(1000, "Catatan maksimal 1000 karakter.")
      .optional(),
  ),
});

export const financeProjectsQuerySchema = z.object({
  status: z.preprocess(
    emptyToUndefined,
    z
      .enum(["DISETUJUI", "MENUNGGU_PERSETUJUAN", "TERCAIRKAN", "DITOLAK"])
      .optional(),
  ),
  search: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(150, "Kata kunci maksimal 150 karakter.").optional(),
  ),
  skema: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(150, "Skema maksimal 150 karakter.").optional(),
  ),
  tahun: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(2000, "Tahun tidak valid.")
      .max(2100, "Tahun tidak valid.")
      .optional(),
  ),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().max(100).optional(),
  ),
});

export type DisburseProjectBody = z.infer<typeof disburseProjectSchema>;
export type FinanceProjectsQuery = z.infer<typeof financeProjectsQuerySchema>;
