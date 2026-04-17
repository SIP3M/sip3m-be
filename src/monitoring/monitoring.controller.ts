import { Request, Response } from "express";
import { HttpError } from "../common/errors/http-error";
import { PengabdianStatus } from "../generated/prisma/enums";
import { getProjectDetail, getProjectsDashboard } from "./monitoring.service";

const parsePageQuery = (pageQuery: unknown): number => {
  if (pageQuery === undefined) {
    return 1;
  }

  const page = Number(pageQuery);
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpError("Query page harus berupa angka bulat >= 1.", 400);
  }

  return page;
};

const parseStatusFilter = (
  statusFilterQuery: unknown,
): PengabdianStatus | undefined => {
  if (statusFilterQuery === undefined) {
    return undefined;
  }

  if (typeof statusFilterQuery !== "string") {
    throw new HttpError("Query statusFilter tidak valid.", 400);
  }

  const normalized = statusFilterQuery.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

  const allowedStatuses = Object.values(PengabdianStatus) as string[];
  if (!allowedStatuses.includes(normalized)) {
    throw new HttpError(
      `statusFilter tidak valid. Gunakan salah satu: ${allowedStatuses.join(", ")}.`,
      400,
    );
  }

  return normalized as PengabdianStatus;
};

const parseSearchQuery = (searchQuery: unknown): string | undefined => {
  if (searchQuery === undefined) {
    return undefined;
  }

  if (typeof searchQuery !== "string") {
    throw new HttpError("Query search tidak valid.", 400);
  }

  const trimmed = searchQuery.trim();
  return trimmed ? trimmed : undefined;
};

export const getDashboardController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const page = parsePageQuery(req.query.page);
    const search = parseSearchQuery(req.query.search);
    const statusFilter = parseStatusFilter(req.query.statusFilter);

    const result = await getProjectsDashboard(page, search, statusFilter);

    return res.status(200).json({
      message: "Success",
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat mengambil monitoring proyek.",
    });
  }
};

export const getDetailController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const projectId = Number(req.params.id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new HttpError("ID proyek tidak valid.", 400);
    }

    const result = await getProjectDetail(projectId);

    return res.status(200).json({
      message: "Success",
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil detail proyek.",
    });
  }
};
