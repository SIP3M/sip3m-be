import { z } from "zod";
import {
  PengabdianDocumentType,
  DocumentVerificationStatus,
} from "../generated/prisma/enums";

const numericIdField = z
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .pipe(
    z
      .number({ message: "ID harus berupa angka." })
      .int("ID harus berupa bilangan bulat.")
      .positive("ID harus lebih dari 0."),
  );

// =============================================
// Upload Document Validation
// =============================================
export const uploadDocumentSchema = z.object({
  projectId: numericIdField,
  documentType: z.enum(
    Object.values(PengabdianDocumentType) as [string, ...string[]],
    {
      message: `Tipe dokumen tidak valid. Tipe yang diperbolehkan: ${Object.values(PengabdianDocumentType).join(", ")}.`,
    },
  ),
});

// =============================================
// Verify Document Validation
// =============================================
export const verifyDocumentSchema = z.object({
  status: z.enum(
    [DocumentVerificationStatus.APPROVED, DocumentVerificationStatus.REJECTED],
    {
      message:
        "Status tidak valid. Status yang diperbolehkan: APPROVED, REJECTED.",
    },
  ),
  notes: z.string().max(1000, "Notes maksimal 1000 karakter.").optional(),
});

// =============================================
// Param Validation
// =============================================
export const projectIdParamSchema = z.object({
  projectId: numericIdField,
});

export const documentIdParamSchema = z.object({
  documentId: numericIdField,
});

// =============================================
// Type Exports
// =============================================
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type VerifyDocumentInput = z.infer<typeof verifyDocumentSchema>;
export type ProjectIdParamInput = z.infer<typeof projectIdParamSchema>;
export type DocumentIdParamInput = z.infer<typeof documentIdParamSchema>;
