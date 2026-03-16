import { Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import { PengabdianStatus } from "../generated/prisma/enums";
import {
  createPengabdianProject,
  getPengabdianProjectByProposalId,
  updatePengabdianStatus,
} from "./pengabdian.service";
import {
  createPengabdianProjectParamSchema,
  getPengabdianProjectByProposalIdParamSchema,
  updatePengabdianStatusSchema,
  projectIdParamSchema,
} from "./pengabdian.validation";

export const createPengabdianProjectController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      throw new HttpError("Unauthorized", 401);
    }

    const paramValidation = createPengabdianProjectParamSchema.safeParse({
      proposalId: req.params.proposalId ?? req.params.id,
    });

    if (!paramValidation.success) {
      return res.status(400).json({
        message: "Validasi parameter gagal.",
        errors: paramValidation.error.flatten().fieldErrors,
      });
    }

    const result = await createPengabdianProject(
      paramValidation.data.proposalId,
    );

    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[CREATE_PENGABDIAN_PROJECT_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat membuat proyek pengabdian.",
    });
  }
};

export const getPengabdianProjectByProposalIdController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      throw new HttpError("Unauthorized", 401);
    }

    const paramValidation =
      getPengabdianProjectByProposalIdParamSchema.safeParse({
        proposalId: req.params.proposalId ?? req.params.id,
      });

    if (!paramValidation.success) {
      return res.status(400).json({
        message: "Validasi parameter gagal.",
        errors: paramValidation.error.flatten().fieldErrors,
      });
    }

    const result = await getPengabdianProjectByProposalId(
      paramValidation.data.proposalId,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[GET_PENGABDIAN_PROJECT_BY_PROPOSAL_ID_ERROR]", error);
    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat mengambil data proyek pengabdian.",
    });
  }
};

export const updatePengabdianStatusController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      throw new HttpError("Unauthorized", 401);
    }

    const paramValidation = projectIdParamSchema.safeParse({
      projectId: req.params.projectId ?? req.params.id,
    });

    if (!paramValidation.success) {
      return res.status(400).json({
        message: "Validasi parameter gagal.",
        errors: paramValidation.error.flatten().fieldErrors,
      });
    }

    const bodyValidation = updatePengabdianStatusSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
    }

    const result = await updatePengabdianStatus(
      paramValidation.data.projectId,
      bodyValidation.data.status as PengabdianStatus,
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[UPDATE_PENGABDIAN_STATUS_ERROR]", error);
    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat memperbarui status proyek pengabdian.",
    });
  }
};
