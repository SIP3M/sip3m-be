import { z } from "zod";
import { PengabdianStatus } from "../generated/prisma/enums";

const numericIdField = z
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .pipe(
    z
      .number({ message: "ID harus berupa angka." })
      .int("ID harus berupa bilangan bulat.")
      .positive("ID harus lebih dari 0."),
  );

export const proposalIdParamSchema = z.object({
  proposalId: numericIdField,
});

export const projectIdParamSchema = z.object({
  projectId: numericIdField,
});

export const createPengabdianProjectParamSchema = proposalIdParamSchema;

export const getPengabdianProjectByProposalIdParamSchema =
  proposalIdParamSchema;

const pengabdianStatuses = Object.values(PengabdianStatus) as [
  string,
  ...string[],
];

export const updatePengabdianStatusSchema = z.object({
  status: z.enum(pengabdianStatuses, {
    message: `Status tidak valid. Status yang diperbolehkan: ${pengabdianStatuses.join(", ")}.`,
  }),
});

const booleanQueryField = z
  .union([z.boolean(), z.string()])
  .transform((val, ctx) => {
    if (typeof val === "boolean") {
      return val;
    }

    const normalized = val.toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "is_archived harus bernilai true atau false.",
    });
    return z.NEVER;
  });

export const getAllPengabdianProjectsQuerySchema = z.object({
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
  is_archived: booleanQueryField.optional().default(false),
});

export type ProposalIdParamInput = z.infer<typeof proposalIdParamSchema>;
export type ProjectIdParamInput = z.infer<typeof projectIdParamSchema>;
export type UpdatePengabdianStatusInput = z.infer<
  typeof updatePengabdianStatusSchema
>;
export type GetAllPengabdianProjectsQueryInput = z.infer<
  typeof getAllPengabdianProjectsQuerySchema
>;
