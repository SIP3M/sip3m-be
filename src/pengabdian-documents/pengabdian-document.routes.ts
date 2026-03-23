import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { validate } from "../common/middleware/validate";
import { ROLES } from "../auth/role";
import {
  uploadDocumentMiddleware,
  handleUploadError,
  milestoneDocumentUploadFields,
} from "./upload.middleware";
import {
  uploadMilestoneDocumentsController,
  getDocumentsController,
  verifyDocumentController,
  deleteDocumentController,
} from "./pengabdian-document.controller";
import { verifyDocumentSchema } from "./pengabdian-document.validation";

const router = Router();

// =============================================
// Pengabdian Documents Management
// =============================================

/**
 * POST /pengabdian-documents/upload
 * Upload dokumen laporan pengabdian (semua role yang authenticated)
 */
router.post(
  "/pengabdian-documents/upload",
  authMiddleware,
  uploadDocumentMiddleware.fields(milestoneDocumentUploadFields),
  handleUploadError,
  uploadMilestoneDocumentsController,
);

/**
 * GET /pengabdian-documents/:projectId
 * Ambil semua dokumen untuk project (semua role yang authenticated)
 */
router.get(
  "/pengabdian-documents/:projectId",
  authMiddleware,
  getDocumentsController,
);

/**
 * PATCH /pengabdian-documents/:documentId/verify
 * Verifikasi dokumen - hanya Admin dan Staff LPPM
 */
router.patch(
  "/pengabdian-documents/:documentId/verify",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  validate(verifyDocumentSchema),
  verifyDocumentController,
);

/**
 * DELETE /pengabdian-documents/:documentId
 * Hapus dokumen - hanya Admin dan Staff LPPM
 */
router.delete(
  "/pengabdian-documents/:documentId",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  deleteDocumentController,
);

export default router;
