import { Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import type { ProposalStatus } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { z } from "zod";
import {
  createProposalSchema,
  evaluateProposalSchema,
  editProposalSchema,
  updateProposalStatusSchema,
  assignReviewerSchema,
  assignManualReviewerSchema,
  reassignReviewerSchema,
  getAllProposalsQuerySchema,
  adminVerificationQueueQuerySchema,
  adminVerificationDecisionSchema,
  adminVerificationHistoryQuerySchema,
  revokeAdminVerificationSchema,
  FUNDING_MAX_MESSAGE,
} from "./proposal.validation";
import { normalizeProposalReferensi } from "../master/referensi/referensi.service";
import {
  createProposal as createProposalService,
  deleteProposal,
  editProposal,
  getAllProposals as getAllProposalsService,
  getAssignedProposalsForReviewer,
  getMyProposals as getMyProposalsService,
  getProposalById,
  getProposalReviews,
  evaluateProposal as evaluateProposalService,
  submitProposal,
  updateProposalStatus,
  autoAssignReviewerService,
  assignReviewerManualService,
  reassignReviewerService,
  getReviewerCandidatesService,
  getAdminVerificationQueue,
  getAdminVerificationChecklist,
  getAdminVerificationStats,
  getAdminVerificationHistory,
  claimAdminVerification,
  releaseAdminVerificationClaim,
  submitAdminVerification,
  revokeAdminVerification,
} from "./proposal.service";
import type { ProposalFiles } from "./proposal.types";

/**
 * Tangkap error Prisma yang disebabkan input user supaya TIDAK berujung pada
 * 500 generik "Terjadi kesalahan pada server saat menyimpan proposal.".
 *
 * - Integer overflow (funding_request_amount > 2.147.483.647 / INT4) -> 400
 *   dengan pesan batas nominal, agar FE menampilkannya per-field.
 * - PrismaClientValidationError (nilai tidak valid lain) -> 400.
 *
 * Mengembalikan Response bila cocok, null kalau bukan kandidat (lanjut ke 500).
 */
const handleProposalWriteError = (
  error: unknown,
  res: Response,
): Response | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const isIntOverflow =
    /Unable to fit integer value|out of range for type integer|value out of range|Expected Int, provided/i.test(
      error.message,
    );

  if (isIntOverflow) {
    return res.status(400).json({
      message: FUNDING_MAX_MESSAGE,
      errors: { funding_request_amount: [FUNDING_MAX_MESSAGE] },
    });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      message: "Data proposal tidak valid. Periksa kembali isian form Anda.",
    });
  }

  return null;
};

export const createProposalController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }
    const userId = Number(req.user.userId);

    // Validasi input menggunakan Zod
    const validation = createProposalSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const files = req.files as ProposalFiles | undefined;

    // Normalisasi skema/sumber_pendanaan ke master aktif (400 bila tak dikenal)
    const data = await normalizeProposalReferensi(validation.data);

    const result = await createProposalService(userId, data, files);

    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[CREATE_PROPOSAL_ERROR]", error);
    const handled = handleProposalWriteError(error, res);
    if (handled) return handled;
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menyimpan proposal.",
    });
  }
};

export const getAllProposalsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const queryValidation = getAllProposalsQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: queryValidation.error.flatten().fieldErrors,
      });
    }

    const proposals = await getAllProposalsService({
      page: queryValidation.data.page,
      search: queryValidation.data.search,
      skema: queryValidation.data.skema,
      tahun: queryValidation.data.tahun,
      status: queryValidation.data.status as ProposalStatus | undefined,
    });

    return res.status(200).json({
      message: "Berhasil mengambil daftar proposal.",
      ...proposals,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[GET_ALL_PROPOSALS_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil data proposal.",
    });
  }
};

export const getMyProposalsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const userId = Number(req.user.userId);

    const queryValidation = getAllProposalsQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: queryValidation.error.flatten().fieldErrors,
      });
    }

    const proposals = await getMyProposalsService({
      userId,
      page: queryValidation.data.page,
      search: queryValidation.data.search,
      status: queryValidation.data.status as ProposalStatus | undefined,
    });

    return res.status(200).json({
      message: "Berhasil mengambil daftar proposal saya.",
      ...proposals,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[GET_MY_PROPOSALS_ERROR]", error);
    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat mengambil data proposal saya.",
    });
  }
};

export const getAssignedProposalsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const reviewerId = Number(req.user.userId);

    const queryValidation = getAllProposalsQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: queryValidation.error.flatten().fieldErrors,
      });
    }

    const proposals = await getAssignedProposalsForReviewer({
      reviewerId,
      page: queryValidation.data.page,
      search: queryValidation.data.search,
      status: queryValidation.data.status as ProposalStatus | undefined,
    });

    return res.status(200).json({
      message: "Berhasil mengambil daftar proposal tugas reviewer.",
      ...proposals,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[GET_ASSIGNED_PROPOSALS_ERROR]", error);
    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat mengambil data tugas proposal reviewer.",
    });
  }
};

export const getProposalByIdController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const userId = Number(req.user.userId);
    const userRole = String(
      req.user.role ?? req.user.roles ?? "",
    ).toUpperCase();
    if (!userRole) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposal = await getProposalById(proposalId);

    if (userRole === "DOSEN" && proposal.lead_researcher_id !== userId) {
      throw new HttpError(
        "Anda tidak memiliki izin untuk melihat proposal ini.",
        403,
      );
    }

    return res.status(200).json({
      message: "Berhasil mengambil proposal.",
      data: proposal,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    } else {
      console.error("[GET_PROPOSAL_BY_ID_ERROR]", error);
      return res.status(500).json({
        message: "Terjadi kesalahan pada server saat mengambil data proposal.",
      });
    }
  }
};

export const editProposalController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }
    const userId = Number(req.user.userId);

    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    // Validasi input menggunakan Zod
    const validation = editProposalSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const files = req.files as ProposalFiles | undefined;

    // Normalisasi skema/sumber_pendanaan ke master aktif (400 bila tak dikenal)
    const data = await normalizeProposalReferensi(validation.data);

    const result = await editProposal(proposalId, userId, data, files);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[EDIT_PROPOSAL_ERROR]", error);
    const handled = handleProposalWriteError(error, res);
    if (handled) return handled;
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengedit proposal.",
    });
  }
};

export const deleteProposalController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }
    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    // Implementasi logika penghapusan proposal di sini
    // Pastikan hanya lead researcher yang dapat menghapus proposal
    await deleteProposal(proposalId, req.user.userId);

    return res.status(200).json({
      message: "Proposal berhasil dihapus.",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[DELETE_PROPOSAL_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menghapus proposal.",
    });
  }
};

export const submitProposalController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const userId = Number(req.user.userId);
    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const result = await submitProposal(proposalId, userId);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[SUBMIT_PROPOSAL_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengirim proposal.",
    });
  }
};

export const updateProposalStatusController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId || !req.user?.role) {
      throw new HttpError("Unauthorized", 401);
    }

    const userId = Number(req.user.userId);
    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const validation = updateProposalStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const result = await updateProposalStatus(
      proposalId,
      userId,
      req.user.role,
      validation.data,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[UPDATE_PROPOSAL_STATUS_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengubah status proposal.",
    });
  }
};

export const assignReviewersController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    // Tangkap dan validasi body request yang berisi array proposalIds
    const validatedData = assignReviewerSchema.parse(req.body);

    // Panggil Service Bulk Assign — otomatis bila reviewerId tidak diisi,
    // ke reviewer pilihan admin bila diisi (plotting massal manual).
    const result = await autoAssignReviewerService(
      validatedData.proposalIds,
      validatedData.reviewerId,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Tegaskan kepada TypeScript bahwa 'error' ini adalah ZodError bawaan Zod
      const zodError = error as z.ZodError;
      
      return res.status(400).json({
        message: "Validasi gagal.",
        errors: zodError.issues, // Menggunakan .issues yang didukung penuh oleh TypeScript
      });
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[BULK_AUTO_ASSIGN_REVIEWER_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat melakukan auto-assign massal.",
    });
  }
};

/**
 * GET /proposals/:id/reviewer-candidates
 * Daftar kandidat reviewer untuk 1 proposal — dipakai FE pada pemilihan
 * reviewer manual & menampilkan hasil plotting.
 */
export const getReviewerCandidatesController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const result = await getReviewerCandidatesService(proposalId);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[REVIEWER_CANDIDATES_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil kandidat reviewer.",
    });
  }
};

/**
 * POST /proposals/:id/reviewer
 * Assign reviewer MANUAL — hanya untuk proposal yang BELUM terplot;
 * bila sudah terplot ditolak dengan 409 (gunakan PUT untuk reassign).
 */
export const assignReviewerManuallyController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const validatedData = assignManualReviewerSchema.parse(req.body);

    const result = await assignReviewerManualService(
      proposalId,
      validatedData.reviewerId,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;

      return res.status(400).json({
        message: "Validasi gagal.",
        errors: zodError.issues,
      });
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ASSIGN_REVIEWER_MANUAL_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menugaskan reviewer.",
    });
  }
};

/**
 * PUT /proposals/:id/reviewer
 * Ubah (reassign) reviewer pada proposal yang SUDAH terplot.
 * Konflik kepentingan tetap diblokir; tanpa notifikasi in-app.
 */
export const reassignReviewerManuallyController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const validatedData = reassignReviewerSchema.parse(req.body);

    const result = await reassignReviewerService(
      proposalId,
      validatedData.reviewerId,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;

      return res.status(400).json({
        message: "Validasi gagal.",
        errors: zodError.issues,
      });
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[REASSIGN_REVIEWER_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengubah penugasan reviewer.",
    });
  }
};

export const getProposalReviewsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const reviews = await getProposalReviews(proposalId);

    return res.status(200).json({
      message: "Berhasil mengambil riwayat review.",
      data: reviews,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[GET_PROPOSAL_REVIEWS_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil riwayat review.",
    });
  }
};

export const evaluateProposalController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (Number.isNaN(proposalId) || proposalId <= 0) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const validation = evaluateProposalSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const reviewerId = Number(req.user.userId);
    const result = await evaluateProposalService(
      proposalId,
      reviewerId,
      validation.data,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2000") {
        return res.status(400).json({
          message:
            "Data penilaian melebihi batas panjang kolom database. Mohon periksa panjang teks yang dikirim.",
        });
      }
    }

    console.error("[EVALUATE_PROPOSAL_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menilai proposal.",
    });
  }
};

// =============================================
// Verifikasi Administrasi (REVIEWER_ADMINISTRASI)
// =============================================

export const getAdminVerificationQueueController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const parsed = adminVerificationQueueQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await getAdminVerificationQueue({
      page: parsed.data.page,
      search: parsed.data.search,
      skema: parsed.data.skema,
      adminStatus: parsed.data.admin_status,
      userId: Number(req.user.userId),
    });

    return res.status(200).json({
      message: "Berhasil mengambil antrean verifikasi administrasi.",
      ...result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ADMIN_VERIFICATION_QUEUE_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil antrean verifikasi.",
    });
  }
};

export const getAdminVerificationChecklistController = async (
  _req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const data = await getAdminVerificationChecklist();
    return res.status(200).json({
      message: "Berhasil mengambil checklist verifikasi administrasi.",
      data,
    });
  } catch (error) {
    console.error("[ADMIN_VERIFICATION_CHECKLIST_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil checklist.",
    });
  }
};

export const getAdminVerificationStatsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const data = await getAdminVerificationStats(Number(req.user.userId));
    return res.status(200).json({
      message: "Berhasil mengambil statistik verifikasi administrasi.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ADMIN_VERIFICATION_STATS_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil statistik.",
    });
  }
};

export const getAdminVerificationHistoryController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const parsed = adminVerificationHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await getAdminVerificationHistory({
      page: parsed.data.page,
      userId: Number(req.user.userId),
      hanyaSaya: parsed.data.hanya_saya === "true",
    });

    return res.status(200).json({
      message: "Berhasil mengambil riwayat verifikasi administrasi.",
      ...result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ADMIN_VERIFICATION_HISTORY_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil riwayat.",
    });
  }
};

export const claimAdminVerificationController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (Number.isNaN(proposalId) || proposalId <= 0) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const result = await claimAdminVerification(
      proposalId,
      Number(req.user.userId),
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ADMIN_VERIFICATION_CLAIM_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat klaim verifikasi.",
    });
  }
};

export const releaseAdminVerificationClaimController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (Number.isNaN(proposalId) || proposalId <= 0) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const result = await releaseAdminVerificationClaim(
      proposalId,
      Number(req.user.userId),
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ADMIN_VERIFICATION_RELEASE_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat melepas klaim verifikasi.",
    });
  }
};

export const submitAdminVerificationController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (Number.isNaN(proposalId) || proposalId <= 0) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const parsed = adminVerificationDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await submitAdminVerification(
      proposalId,
      Number(req.user.userId),
      parsed.data,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ADMIN_VERIFICATION_SUBMIT_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menyimpan verifikasi.",
    });
  }
};

export const revokeAdminVerificationController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const proposalId = Number(req.params.id);
    if (Number.isNaN(proposalId) || proposalId <= 0) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const parsed = revokeAdminVerificationSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await revokeAdminVerification(
      proposalId,
      Number(req.user.userId),
      parsed.data.catatan,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ADMIN_VERIFICATION_REVOKE_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menarik verifikasi.",
    });
  }
};
