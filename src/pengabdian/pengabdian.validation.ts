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

export type ProposalIdParamInput = z.infer<typeof proposalIdParamSchema>;
export type ProjectIdParamInput = z.infer<typeof projectIdParamSchema>;
export type UpdatePengabdianStatusInput = z.infer<
  typeof updatePengabdianStatusSchema
>;
