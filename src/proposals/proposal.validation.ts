import { z } from "zod";
import { ProposalStatus } from "../generated/prisma/enums";

// =============================================
// Base Fields (DRY - reusable across schemas)
// =============================================
const titleField = z
  .string()
  .min(5, "Judul proposal minimal 5 karakter.")
  .max(255, "Judul proposal maksimal 255 karakter.");

const facultyField = z.string().max(100, "Fakultas maksimal 100 karakter.");

const skemaField = z.string().max(100, "Skema maksimal 100 karakter.");

const fundingField = z
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .pipe(z.number().min(0, "Jumlah pendanaan tidak boleh negatif."));

const isDraftField = z
  .union([z.string(), z.boolean()])
  .transform((val) => val === "true" || val === true);

export const createProposalSchema = z.object({
  title: titleField,
  faculty: facultyField.optional(),
  skema: skemaField.optional(),
  funding_request_amount: fundingField.optional().default(0),
  is_draft: isDraftField.optional().default(false),
});

export const editProposalSchema = z.object({
  title: titleField.optional(),
  faculty: facultyField.optional(),
  skema: skemaField.optional(),
  funding_request_amount: fundingField.optional(),
  is_draft: isDraftField.optional(),
});

const adminReviewerStatuses = Object.values(ProposalStatus).filter(
  (s) => s !== ProposalStatus.DRAFT && s !== ProposalStatus.SUBMITTED,
) as [string, ...string[]];

export const updateProposalStatusSchema = z.object({
  status: z.enum(adminReviewerStatuses, {
    message: `Status tidak valid. Status yang diperbolehkan: ${adminReviewerStatuses.join(", ")}.`,
  }),
  notes: z.string().max(500, "Catatan maksimal 500 karakter.").optional(),
});

export const assignReviewerSchema = z.object({
  reviewerIds: z
    .array(z.number({ message: "Setiap ID reviewer harus berupa angka." }))
    .length(2, "Harus memilih tepat 2 reviewer.")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "ID reviewer tidak boleh sama.",
    ),
});

const scoreField = z
  .number({ message: "Nilai skor harus berupa angka." })
  .min(0, "Skor minimal 0.")
  .max(100, "Skor maksimal 100.");

const reviewDecisionStatuses = [
  ProposalStatus.ACCEPTED,
  ProposalStatus.REJECTED,
  ProposalStatus.REVISION,
] as const;

const draftEvaluateProposalSchema = z.object({
  is_draft: z.literal(true),
  status: z
    .enum(reviewDecisionStatuses, {
      message: `Status hasil review tidak valid. Pilihan: ${reviewDecisionStatuses.join(", ")}.`,
    })
    .optional(),
  score_perumusan: scoreField.optional(),
  score_tinjauan: scoreField.optional(),
  score_metode: scoreField.optional(),
  score_anggaran: scoreField.optional(),
  score_luaran: scoreField.optional(),
  kekuatan_proposal: z
    .string()
    .trim()
    .max(5000, "Kekuatan proposal maksimal 5000 karakter.")
    .optional(),
  kelemahan_proposal: z
    .string()
    .trim()
    .max(5000, "Kelemahan proposal maksimal 5000 karakter.")
    .optional(),
  rekomendasi_akhir: z
    .string()
    .trim()
    .max(1000, "Rekomendasi akhir maksimal 1000 karakter.")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Catatan reviewer maksimal 2000 karakter.")
    .optional(),
});

const submitEvaluateProposalSchema = z.object({
  is_draft: z.literal(false),
  status: z.enum(reviewDecisionStatuses, {
    message: `Status hasil review tidak valid. Pilihan: ${reviewDecisionStatuses.join(", ")}.`,
  }),
  score_perumusan: scoreField,
  score_tinjauan: scoreField,
  score_metode: scoreField,
  score_anggaran: scoreField,
  score_luaran: scoreField,
  kekuatan_proposal: z
    .string()
    .trim()
    .min(1, "Kekuatan proposal wajib diisi saat submit review.")
    .max(5000, "Kekuatan proposal maksimal 5000 karakter."),
  kelemahan_proposal: z
    .string()
    .trim()
    .min(1, "Kelemahan proposal wajib diisi saat submit review.")
    .max(5000, "Kelemahan proposal maksimal 5000 karakter."),
  rekomendasi_akhir: z
    .string()
    .trim()
    .min(1, "Rekomendasi akhir wajib diisi saat submit review.")
    .max(1000, "Rekomendasi akhir maksimal 1000 karakter."),
  notes: z
    .string()
    .trim()
    .max(2000, "Catatan reviewer maksimal 2000 karakter.")
    .optional(),
});

export const evaluateProposalSchema = z.discriminatedUnion("is_draft", [
  draftEvaluateProposalSchema,
  submitEvaluateProposalSchema,
]);

export const getAllProposalsQuerySchema = z.object({
  page: z.coerce
    .number({ message: "page harus berupa angka." })
    .int("page harus berupa bilangan bulat.")
    .min(1, "page minimal 1.")
    .default(1),
  search: z.string().trim().optional(),
  status: z
    .enum(Object.values(ProposalStatus) as [string, ...string[]], {
      message: `status tidak valid. Status yang diperbolehkan: ${Object.values(ProposalStatus).join(", ")}.`,
    })
    .optional(),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type EditProposalInput = z.infer<typeof editProposalSchema>;
export type UpdateProposalStatusInput = z.infer<
  typeof updateProposalStatusSchema
>;
export type AssignReviewerInput = z.infer<typeof assignReviewerSchema>;
export type GetAllProposalsQueryInput = z.infer<
  typeof getAllProposalsQuerySchema
>;
export type EvaluateProposalInput = z.infer<typeof evaluateProposalSchema>;
