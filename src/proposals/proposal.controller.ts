import { Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import type { ProposalStatus } from "../generated/prisma/enums";
import {
  createProposalSchema,
  evaluateProposalSchema,
  editProposalSchema,
  updateProposalStatusSchema,
  assignReviewerSchema,
  getAllProposalsQuerySchema,
} from "./proposal.validation";
import {
  createProposal as createProposalService,
  deleteProposal,
  editProposal,
  getAllProposals as getAllProposalsService,
  getMyProposals as getMyProposalsService,
  getProposalById,
  getProposalReviews,
  evaluateProposal as evaluateProposalService,
  submitProposal,
  updateProposalStatus,
  assignReviewersService,
} from "./proposal.service";
import type { ProposalFiles } from "./proposal.types";

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

    const result = await createProposalService(userId, validation.data, files);

    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[CREATE_PROPOSAL_ERROR]", error);
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

    const proposal = await getProposalById(proposalId);

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

    const result = await editProposal(
      proposalId,
      userId,
      validation.data,
      files,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[EDIT_PROPOSAL_ERROR]", error);
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

    const proposalId = Number(req.params.id);
    if (isNaN(proposalId)) {
      return res.status(400).json({ message: "ID proposal tidak valid." });
    }

    const validation = assignReviewerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const result = await assignReviewersService(
      proposalId,
      validation.data.reviewerIds,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ASSIGN_REVIEWERS_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menugaskan reviewer.",
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

    console.error("[EVALUATE_PROPOSAL_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menilai proposal.",
    });
  }
};
