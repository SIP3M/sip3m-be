import { Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import { PengabdianStatus } from "../generated/prisma/enums";
import {
  archiveProject,
  createPengabdianProject,
  getAllPengabdianProjects,
  getPengabdianProjectByProposalId,
  updateProjectDetails,
  updatePengabdianStatus,
} from "./pengabdian.service";
import {
  createPengabdianProjectParamSchema,
  getAllPengabdianProjectsQuerySchema,
  getPengabdianProjectByProposalIdParamSchema,
  updatePengabdianStatusSchema,
  projectIdParamSchema,
} from "./pengabdian.validation";
import type { UpdateProjectDetailsInput } from "./pengabdian.types";

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

export const getAllPengabdianProjectsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user) {
      throw new HttpError("Unauthorized", 401);
    }

    const userId = Number(req.user.userId ?? req.user.sub);
    if (Number.isNaN(userId) || userId <= 0) {
      throw new HttpError("Unauthorized", 401);
    }

    const userRole = String(
      req.user.role ?? req.user.roles ?? "",
    ).toUpperCase();
    if (!userRole) {
      throw new HttpError("Unauthorized", 401);
    }

    const queryValidation = getAllPengabdianProjectsQuerySchema.safeParse(
      req.query,
    );
    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: queryValidation.error.flatten().fieldErrors,
      });
    }

    const projects = await getAllPengabdianProjects({
      ...queryValidation.data,
      userId,
      userRole,
    });

    return res.status(200).json({
      message: "Berhasil mengambil daftar proyek pengabdian.",
      ...projects,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[GET_ALL_PENGABDIAN_PROJECTS_ERROR]", error);
    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat mengambil data proyek pengabdian.",
    });
  }
};

export const updateProjectDetailsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      throw new HttpError("Unauthorized", 401);
    }

    const projectId = Number(req.params.projectId ?? req.params.id);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({
        message: "ID proyek pengabdian tidak valid.",
      });
    }

    const body = req.body as UpdateProjectDetailsInput;

    const result = await updateProjectDetails(projectId, {
      summary: body.summary,
      start_date: body.start_date,
      end_date: body.end_date,
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[UPDATE_PROJECT_DETAILS_ERROR]", error);
    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat memperbarui detail proyek pengabdian.",
    });
  }
};

export const archiveProjectController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.sub) {
      throw new HttpError("Unauthorized", 401);
    }

    const paramValidation = projectIdParamSchema.safeParse({
      projectId: req.params.id,
    });

    if (!paramValidation.success) {
      return res.status(400).json({
        message: "Validasi parameter gagal.",
        errors: paramValidation.error.flatten().fieldErrors,
      });
    }

    const result = await archiveProject(paramValidation.data.projectId);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[ARCHIVE_PROJECT_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengarsipkan proyek.",
    });
  }
};
