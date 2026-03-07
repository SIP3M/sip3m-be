import { z } from "zod";

export const createProposalSchema = z.object({
  title: z
    .string()
    .min(5, "Judul proposal minimal 5 karakter.")
    .max(255, "Judul proposal maksimal 255 karakter."),
  faculty: z.string().max(100, "Fakultas maksimal 100 karakter.").optional(),
  skema: z.string().max(100, "Skema maksimal 100 karakter.").optional(),
  funding_request_amount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(0, "Jumlah pendanaan tidak boleh negatif."))
    .optional()
    .default(0),
  is_draft: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === "true" || val === true)
    .optional()
    .default(false),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
