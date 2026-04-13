import { z } from "zod";

export const getPublicRepositorySchema = z.object({
  page: z.coerce
    .number({ message: "page harus berupa angka." })
    .int("page harus berupa bilangan bulat.")
    .min(1, "page minimal 1.")
    .default(1),
  limit: z.coerce
    .number({ message: "limit harus berupa angka." })
    .int("limit harus berupa bilangan bulat.")
    .min(1, "limit minimal 1.")
    .default(5),
  search: z.string().trim().optional(),
});

export type GetPublicRepositoryQuery = z.infer<
  typeof getPublicRepositorySchema
>;
