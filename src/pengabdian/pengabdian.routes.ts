import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";
import {
  createPengabdianProjectController,
  getPengabdianProjectByProposalIdController,
  updatePengabdianStatusController,
} from "./pengabdian.controller";

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

export default router;
