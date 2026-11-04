import { z } from "zod";

export const getPublikasiSchema = z.object({
  search: z
    .string({ message: "search wajib diisi." })
    .trim()
    .min(2, "search minimal 2 karakter."),
  page: z.coerce
    .number({ message: "page harus berupa angka." })
    .int("page harus berupa bilangan bulat.")
    .min(1, "page minimal 1.")
    .default(1),
  limit: z.coerce
    .number({ message: "limit harus berupa angka." })
    .int("limit harus berupa bilangan bulat.")
    .min(1, "limit minimal 1.")
    .max(20, "limit maksimal 20.")
    .default(10),
  sort: z
    .enum(["relevance", "terbaru", "terpopuler"], {
      error: "sort harus relevance, terbaru, atau terpopuler.",
    })
    .default("relevance"),
});

export type GetPublikasiQuery = z.infer<typeof getPublikasiSchema>;
