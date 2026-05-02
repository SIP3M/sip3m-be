import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";
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
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  createPengabdianProjectController,
);

router.get(
  "/pengabdian/proposals/:proposalId/project",
  authMiddleware,
  requireRole([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.DOSEN,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  getPengabdianProjectByProposalIdController,
);

router.patch(
  "/pengabdian/projects/:projectId/status",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  updatePengabdianStatusController,
);

router.get(
  "/pengabdian",
  authMiddleware,
  requireRole([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.DOSEN,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  getAllPengabdianProjectsController,
);

// Deprecated alias (backward compatibility)
router.get(
  "/pengabdian/projects",
  authMiddleware,
  requireRole([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.DOSEN,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  getAllPengabdianProjectsController,
);

router.patch(
  "/pengabdian/projects/:projectId/details",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  updateProjectDetailsController,
);

router.post(
  "/pengabdian/projects/:projectId/milestones/:milestoneId/documents",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  uploadDocumentMiddleware.fields(milestoneDocumentUploadFields),
  handleUploadError,
  uploadMilestoneDocumentsController,
);

router.patch(
  "/pengabdian/:id/archive",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  archiveProjectController,
);

export default router;
