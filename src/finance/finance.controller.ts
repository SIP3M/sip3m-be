import { Request, Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import { StatusPencairanDana } from "../generated/prisma/enums";
import {
  approveProjectFunding,
  disburseProject,
  exportFinanceExcel,
  getFinanceProjectDetail,
  getFinanceProjects,
  getSummary,
} from "./finance.service";
import {
  disburseProjectSchema,
  financeProjectsQuerySchema,
} from "./finance.validation";

const parseProjectId = (raw: string | string[]): number => {
  const projectId = Number(Array.isArray(raw) ? raw[0] : raw);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new HttpError("id harus berupa angka bulat positif.", 400);
  }

  return projectId;
};

const parseFilters = (query: Request["query"]) => {
  const parsed = financeProjectsQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new HttpError(
      parsed.error.issues[0]?.message ?? "Filter tidak valid.",
      400,
    );
  }

  return {
    status: parsed.data.status as StatusPencairanDana | undefined,
    search: parsed.data.search,
    skema: parsed.data.skema,
    tahun: parsed.data.tahun,
    page: parsed.data.page,
    limit: parsed.data.limit,
  };
};

const sendError = (error: unknown, res: Response, fallback: string): Response => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error("[FINANCE_ERROR]", error);
  return res.status(500).json({ message: fallback });
};

export const getFinanceSummaryController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const summary = await getSummary();

    return res.status(200).json({
      message: "Ringkasan anggaran berhasil diambil.",
      data: summary,
    });
  } catch (error) {
    return sendError(
      error,
      res,
      "Terjadi kesalahan pada server saat mengambil ringkasan anggaran.",
    );
  }
};

export const getFinanceProjectsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const filters = parseFilters(req.query);
    const result = await getFinanceProjects(filters);

    return res.status(200).json({
      message: "Daftar proyek keuangan berhasil diambil.",
      ...result,
    });
  } catch (error) {
    return sendError(
      error,
      res,
      "Terjadi kesalahan pada server saat mengambil daftar proyek.",
    );
  }
};

export const getFinanceProjectDetailController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const projectId = parseProjectId(req.params.id);
    const project = await getFinanceProjectDetail(projectId);

    return res.status(200).json({
      message: "Detail keuangan proyek berhasil diambil.",
      data: project,
    });
  } catch (error) {
    return sendError(
      error,
      res,
      "Terjadi kesalahan pada server saat mengambil detail proyek.",
    );
  }
};

export const approveProjectFundingController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError("Unauthorized.", 401);
    }

    const projectId = parseProjectId(req.params.id);
    const result = await approveProjectFunding(projectId, userId);

    return res.status(200).json(result);
  } catch (error) {
    return sendError(
      error,
      res,
      "Terjadi kesalahan pada server saat menyetujui anggaran proyek.",
    );
  }
};

export const disburseProjectController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError("Unauthorized.", 401);
    }

    const projectId = parseProjectId(req.params.id);

    // Body sudah dinormalisasi oleh validate(disburseProjectSchema)
    const parsed = disburseProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError("Validation failed.", 400);
    }

    const result = await disburseProject(projectId, userId, {
      realizedAmount: parsed.data.realized_amount,
      note: parsed.data.note,
      proof: req.file,
    });

    return res.status(200).json(result);
  } catch (error) {
    return sendError(
      error,
      res,
      "Terjadi kesalahan pada server saat mencairkan dana proyek.",
    );
  }
};

export const exportFinanceExcelController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const filters = parseFilters(req.query);
    const buffer = await exportFinanceExcel(filters);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Rekap_Keuangan.xlsx"',
    );

    return res.status(200).send(buffer);
  } catch (error) {
    return sendError(
      error,
      res,
      "Terjadi kesalahan pada server saat export rekap keuangan.",
    );
  }
};
