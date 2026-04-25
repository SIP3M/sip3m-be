import { Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import {
  uploadDocument,
  uploadMilestoneDocuments,
  getDocumentsByProjectId,
  verifyDocument,
  deleteDocument,
} from "./pengabdian-document.service";
import {
  PengabdianDocumentType,
  DocumentVerificationStatus,
} from "../generated/prisma/enums";

/**
 * POST /pengabdian-documents/upload
 * Upload dokumen laporan pengabdian
 */
export const uploadDocumentController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "File tidak ditemukan. Pastikan file PDF sudah diunggah.",
      });
    }

    const { projectId, documentType } = req.body;

    // Validasi parameter
    if (!projectId) {
      return res.status(400).json({ message: "projectId wajib diisi." });
    }

    if (!documentType) {
      return res.status(400).json({ message: "documentType wajib diisi." });
    }

    // Validasi documentType adalah enum yang valid
    const validDocumentTypes = Object.values(PengabdianDocumentType);
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        message: `Tipe dokumen tidak valid. Tipe yang diperbolehkan: ${validDocumentTypes.join(", ")}.`,
      });
    }

    const projectIdNum = Number(projectId);
    if (Number.isNaN(projectIdNum) || projectIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "projectId harus berupa angka positif." });
    }

    const userId = Number(req.user.sub);

    const document = await uploadDocument(
      projectIdNum,
      documentType,
      req.file,
      userId,
    );

    return res.status(201).json({
      message: "Dokumen berhasil diunggah.",
      data: document,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[UPLOAD_DOCUMENT_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat upload dokumen.",
    });
  }
};

/**
 * POST /pengabdian-documents/upload
 * Upload dokumen per milestone (laporan/logbook/anggaran)
 */
export const uploadMilestoneDocumentsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const files = (req.files ?? {}) as {
      [fieldname: string]: Express.Multer.File[];
    };

    const totalFiles = Object.values(files).reduce(
      (count, current) => count + (current?.length ?? 0),
      0,
    );

    if (totalFiles < 1) {
      return res.status(400).json({
        message:
          "Minimal satu file wajib diunggah (laporan, logbook, atau anggaran).",
      });
    }

    const { isDraft } = req.body as {
      isDraft?: string | boolean;
    };
    const projectId = req.body.projectId || req.params.projectId;
    const milestoneId = req.body.milestoneId || req.params.milestoneId;

    if (!projectId) {
      return res.status(400).json({ message: "projectId wajib diisi." });
    }

    if (!milestoneId) {
      return res.status(400).json({ message: "milestoneId wajib diisi." });
    }

    const projectIdNum = Number(projectId);
    const milestoneIdNum = Number(milestoneId);

    if (Number.isNaN(projectIdNum) || projectIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "projectId harus berupa angka positif." });
    }

    if (Number.isNaN(milestoneIdNum) || milestoneIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "milestoneId harus berupa angka positif." });
    }

    const parsedIsDraft =
      typeof isDraft === "string"
        ? isDraft.toLowerCase() === "true"
        : Boolean(isDraft);

    const userId = Number(req.user.sub);

    const uploadedDocuments = await uploadMilestoneDocuments(
      projectIdNum,
      milestoneIdNum,
      files,
      userId,
      parsedIsDraft,
    );

    return res.status(201).json({
      message: "Dokumen milestone berhasil diunggah.",
      data: uploadedDocuments,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown upload error";

    console.error("[UPLOAD_MILESTONE_DOCUMENTS_ERROR]", error);
    return res.status(500).json({
      message: `Terjadi kesalahan pada server saat upload dokumen milestone: ${errorMessage}`,
    });
  }
};

/**
 * GET /pengabdian-documents/:projectId
 * Ambil semua dokumen untuk project tertentu
 */
export const getDocumentsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ message: "projectId wajib diisi." });
    }

    const projectIdNum = Number(projectId);
    if (Number.isNaN(projectIdNum) || projectIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "projectId harus berupa angka positif." });
    }

    const documents = await getDocumentsByProjectId(projectIdNum);

    return res.status(200).json({
      message: "Dokumen berhasil diambil.",
      data: documents,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[GET_DOCUMENTS_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil dokumen.",
    });
  }
};

/**
 * PATCH /pengabdian-documents/:documentId/verify
 * Verifikasi dokumen (set status APPROVED atau REJECTED)
 */
export const verifyDocumentController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const { documentId } = req.params;
    const { status, notes } = req.body;

    if (!documentId) {
      return res.status(400).json({ message: "documentId wajib diisi." });
    }

    const documentIdNum = Number(documentId);
    if (Number.isNaN(documentIdNum) || documentIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "documentId harus berupa angka positif." });
    }

    if (!status) {
      return res.status(400).json({ message: "status wajib diisi." });
    }

    // Validasi status adalah enum yang valid
    const validStatuses = Object.values(DocumentVerificationStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status tidak valid. Status yang diperbolehkan: ${validStatuses.join(", ")}.`,
      });
    }

    const document = await verifyDocument(documentIdNum, status, notes);

    return res.status(200).json({
      message: `Dokumen berhasil diverifikasi dengan status ${status}.`,
      data: document,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[VERIFY_DOCUMENT_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat memverifikasi dokumen.",
    });
  }
};

/**
 * DELETE /pengabdian-documents/:documentId
 * Hapus dokumen (hanya jika belum APPROVED)
 */
export const deleteDocumentController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({ message: "documentId wajib diisi." });
    }

    const documentIdNum = Number(documentId);
    if (Number.isNaN(documentIdNum) || documentIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "documentId harus berupa angka positif." });
    }

    const result = await deleteDocument(documentIdNum);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[DELETE_DOCUMENT_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menghapus dokumen.",
    });
  }
};
