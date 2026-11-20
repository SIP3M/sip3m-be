import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import { handleProposalUploadError, uploadMiddleware } from "../config/storage";
import {
  assignReviewersController,
  assignReviewerManuallyController,
  createProposalController,
  deleteProposalController,
  editProposalController,
  evaluateProposalController,
  getAllProposalsController,
  getAssignedProposalsController,
  getMyProposalsController,
  getProposalByIdController,
  getProposalReviewsController,
  getReviewerCandidatesController,
  submitProposalController,
  updateProposalStatusController,
} from "./proposal.controller";

const router = Router();

// =============================================
// CRUD Proposal
// =============================================
router.post(
  "/proposals",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_SAYA),
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
  requirePermission(PERMISSIONS.PROPOSAL_LIHAT),
  getAllProposalsController,
);

// Deprecated alias (backward compatibility)
router.get(
  "/getAllProposals",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_LIHAT),
  getAllProposalsController,
);

router.get(
  "/proposals/me",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_SAYA),
  getMyProposalsController,
);

router.get(
  "/proposals/assigned",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_REVIEW),
  getAssignedProposalsController,
);

router.get(
  "/proposals/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_LIHAT_DETAIL),
  getProposalByIdController,
);

router.put(
  "/proposals/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_SAYA),
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
  requirePermission(PERMISSIONS.PROPOSAL_SAYA),
  deleteProposalController,
);

// =============================================
// Status Transitions
// =============================================

// Dosen: DRAFT/REVISION → SUBMITTED
router.patch(
  "/proposals/:id/submit",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_SAYA),
  submitProposalController,
);

// Admin & Reviewer: role-based status update
router.patch(
  "/proposals/:id/status",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_STATUS),
  updateProposalStatusController,
);

// Admin/Staff LPPM: Bulk assign reviewers secara otomatis
router.post(
  "/proposals/bulk-assign-reviewers",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_PLOTTING),
  assignReviewersController,
);

// Admin/Staff LPPM: Daftar kandidat reviewer untuk 1 proposal
// (pemilihan reviewer manual + menampilkan hasil plotting)
router.get(
  "/proposals/:id/reviewer-candidates",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_PLOTTING),
  getReviewerCandidatesController,
);

// Admin/Staff LPPM: Assign reviewer MANUAL untuk 1 proposal.
// Hanya berlaku selama BELUM terplot — setelah terplot bersifat final.
router.post(
  "/proposals/:id/reviewer",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_PLOTTING),
  assignReviewerManuallyController,
);

router.put(
  "/proposals/:id/evaluate",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_REVIEW),
  evaluateProposalController,
);

router.get(
  "/proposals/:id/reviews",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_LIHAT_REVIEW),
  getProposalReviewsController,
);

export default router;
