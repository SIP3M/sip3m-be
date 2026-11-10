import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import {
  archiveProjectController,
  createPengabdianProjectController,
  getAllPengabdianProjectsController,
  getPengabdianProjectByProposalIdController,
  updateProjectDetailsController,
  updatePengabdianStatusController,
} from "./pengabdian.controller";
import {
  uploadDocumentMiddleware,
  handleUploadError,
  milestoneDocumentUploadFields,
} from "../pengabdian-documents/upload.middleware";
import { uploadMilestoneDocumentsController } from "../pengabdian-documents/pengabdian-document.controller";

const router = Router();

// =============================================
// Pengabdian Project Management
// =============================================
router.post(
  "/pengabdian/proposals/:proposalId/project",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_KELOLA),
  createPengabdianProjectController,
);

router.get(
  "/pengabdian/proposals/:proposalId/project",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_LIHAT),
  getPengabdianProjectByProposalIdController,
);

router.patch(
  "/pengabdian/projects/:projectId/status",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_KELOLA),
  updatePengabdianStatusController,
);

router.get(
  "/pengabdian",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_LIHAT),
  getAllPengabdianProjectsController,
);

// Deprecated alias (backward compatibility)
router.get(
  "/pengabdian/projects",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_LIHAT),
  getAllPengabdianProjectsController,
);

router.patch(
  "/pengabdian/projects/:projectId/details",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_KELOLA),
  updateProjectDetailsController,
);

router.post(
  "/pengabdian/projects/:projectId/milestones/:milestoneId/documents",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_MILESTONE),
  uploadDocumentMiddleware.fields(milestoneDocumentUploadFields),
  handleUploadError,
  uploadMilestoneDocumentsController,
);

router.patch(
  "/pengabdian/:id/archive",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_KELOLA),
  archiveProjectController,
);

export default router;
