import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { PERMISSIONS } from "../auth/permission";
import { ROLES } from "../auth/role";
import { handleProposalUploadError, uploadMiddleware } from "../config/storage";
import {
  assignReviewersController,
  assignReviewerManuallyController,
  reassignReviewerManuallyController,
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
  getAdminVerificationQueueController,
  getAdminVerificationChecklistController,
  getAdminVerificationStatsController,
  getAdminVerificationHistoryController,
  claimAdminVerificationController,
  releaseAdminVerificationClaimController,
  submitAdminVerificationController,
  revokeAdminVerificationController,
} from "./proposal.controller";

const router = Router();

// =============================================
// Verifikasi Administrasi (REVIEWER_ADMINISTRASI)
// Didaftarkan sebelum /proposals/:id agar tidak tertangkap route detail.
// =============================================
router.get(
  "/proposals/admin-verification/queue",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_VERIFIKASI_ADMINISTRASI),
  getAdminVerificationQueueController,
);

router.get(
  "/proposals/admin-verification/checklist",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_VERIFIKASI_ADMINISTRASI),
  getAdminVerificationChecklistController,
);

router.get(
  "/proposals/admin-verification/stats",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_VERIFIKASI_ADMINISTRASI),
  getAdminVerificationStatsController,
);

router.get(
  "/proposals/admin-verification/history",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_VERIFIKASI_ADMINISTRASI),
  getAdminVerificationHistoryController,
);

router.post(
  "/proposals/:id/admin-verification/claim",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_VERIFIKASI_ADMINISTRASI),
  claimAdminVerificationController,
);

router.delete(
  "/proposals/:id/admin-verification/claim",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_VERIFIKASI_ADMINISTRASI),
  releaseAdminVerificationClaimController,
);

router.post(
  "/proposals/:id/admin-verification",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_VERIFIKASI_ADMINISTRASI),
  submitAdminVerificationController,
);

// Penarikan verifikasi yang sudah lolos — hanya Ketua LPPM (override).
router.post(
  "/proposals/:id/admin-verification/revoke",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_VERIFIKASI_ADMINISTRASI),
  requireRole([ROLES.KETUA_LPPM]),
  revokeAdminVerificationController,
);

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
// Hanya berlaku selama BELUM terplot — setelah terplot gunakan PUT.
router.post(
  "/proposals/:id/reviewer",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_PLOTTING),
  assignReviewerManuallyController,
);

// Admin/Staff LPPM: Ubah (reassign) reviewer pada proposal SUDAH terplot.
// Konflik kepentingan tetap diblokir; lintas fakultas diizinkan.
router.put(
  "/proposals/:id/reviewer",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_PLOTTING),
  reassignReviewerManuallyController,
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
