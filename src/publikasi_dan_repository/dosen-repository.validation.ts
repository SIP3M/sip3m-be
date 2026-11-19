import { z } from "zod";

export const getDosenRepositorySchema = z.object({
  page: z.coerce
    .number({ message: "page harus berupa angka." })
    .int("page harus berupa bilangan bulat.")
    .min(1, "page minimal 1.")
    .default(1),
  limit: z.coerce
    .number({ message: "limit harus berupa angka." })
    .int("limit harus berupa bilangan bulat.")
    .min(1, "limit minimal 1.")
    .max(100, "limit maksimal 100.")
    .default(10),
  search: z
    .string()
    .trim()
    .max(100, "search maksimal 100 karakter.")
    .optional()
    .refine((value) => value === undefined || value.length === 0 || value.length >= 2, {
      message: "search minimal 2 karakter.",
    }),
});

export type GetDosenRepositoryQuery = z.infer<typeof getDosenRepositorySchema>;

export const getDosenPublikasiSchema = z.object({
  id: z
    .string({ message: "id wajib diisi." })
    .trim()
    .min(1, "id wajib diisi.")
    .max(64, "id tidak valid."),
  basis: z.enum(["scopus", "garuda", "googlescholar"], {
    message: "basis harus scopus, garuda, atau googlescholar.",
  }),
});

export type GetDosenPublikasiQuery = z.infer<typeof getDosenPublikasiSchema>;
