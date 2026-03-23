import {
  PengabdianDocumentType,
  DocumentVerificationStatus,
} from "../generated/prisma/enums";

/**
 * DTO untuk upload dokumen request
 */
export interface UploadDocumentDto {
  projectId: number;
  documentType: PengabdianDocumentType;
}

/**
 * DTO untuk verifikasi dokumen request
 */
export interface VerifyDocumentDto {
  status: DocumentVerificationStatus;
  notes?: string;
}

/**
 * Response untuk upload dokumen
 */
export interface UploadDocumentResponse {
  id: number;
  project_id: number;
  file_path: string;
  title: string | null;
  document_type: PengabdianDocumentType;
  verification_status: DocumentVerificationStatus;
  uploaded_at: Date;
}

/**
 * Response untuk get dokumen project
 */
export interface GetDocumentsResponse {
  id: number;
  project_id: number;
  milestone_id: number | null;
  title: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: PengabdianDocumentType;
  verification_status: DocumentVerificationStatus;
  uploaded_at: Date;
  uploader: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Response untuk verifikasi dokumen
 */
export interface VerifyDocumentResponse {
  id: number;
  verification_status: DocumentVerificationStatus;
  verification_notes: string | null;
}

/**
 * Response untuk delete dokumen
 */
export interface DeleteDocumentResponse {
  message: string;
  id: number;
}
