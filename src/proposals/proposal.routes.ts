import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { handleProposalUploadError, uploadMiddleware } from "../config/storage";
import {
  assignReviewersController,
  createProposalController,
  deleteProposalController,
  editProposalController,
  evaluateProposalController,
  getAllProposalsController,
  getAssignedProposalsController,
  getMyProposalsController,
  getProposalByIdController,
  getProposalReviewsController,
  submitProposalController,
  updateProposalStatusController,
} from "./proposal.controller";
import { ROLES } from "../auth/role";

const router = Router();

// =============================================
// CRUD Proposal
// =============================================
router.post(
  "/proposals",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  uploadMiddleware.fields([
    { name: "proposal_file", maxCount: 1 },
    { name: "rab_file", maxCount: 1 },
  ]),
  handleProposalUploadError,
  createProposalController,
);

router.get(
  "/proposals",
  authMiddleware,
  requireRole([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  getAllProposalsController,
);

// Deprecated alias (backward compatibility)
router.get(
  "/getAllProposals",
  authMiddleware,
  requireRole([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  getAllProposalsController,
);

router.get(
  "/proposals/me",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  getMyProposalsController,
);

router.get(
  "/proposals/assigned",
  authMiddleware,
  requireRole([ROLES.REVIEWER, ROLES.REVIEWER_EKSTERNAL]),
  getAssignedProposalsController,
);

router.get(
  "/proposals/:id",
  authMiddleware,
  requireRole([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.DOSEN,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  getProposalByIdController,
);

router.put(
  "/proposals/:id",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  uploadMiddleware.fields([
    { name: "proposal_file", maxCount: 1 },
    { name: "rab_file", maxCount: 1 },
  ]),
  handleProposalUploadError,
  editProposalController,
);

router.delete(
  "/proposals/:id",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  deleteProposalController,
);

// =============================================
// Status Transitions
// =============================================

// Dosen: DRAFT/REVISION → SUBMITTED
router.patch(
  "/proposals/:id/submit",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  submitProposalController,
);

// Admin & Reviewer: role-based status update
router.patch(
  "/proposals/:id/status",
  authMiddleware,
  requireRole([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  updateProposalStatusController,
);

// Admin/Staff LPPM: assign 1-2 reviewers → UNDER_REVIEW
router.post(
  "/proposals/:id/assign-reviewers",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  assignReviewersController,
);

router.put(
  "/proposals/:id/evaluate",
  authMiddleware,
  requireRole([ROLES.REVIEWER, ROLES.REVIEWER_EKSTERNAL]),
  evaluateProposalController,
);

router.get(
  "/proposals/:id/reviews",
  authMiddleware,
  requireRole([
    ROLES.DOSEN,
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  getProposalReviewsController,
);

export default router;
