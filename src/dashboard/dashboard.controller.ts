import { Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import { getAdminDashboardData, getKkmDashboardData } from "./dashboard.service";

export const getAdminDashboardController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    // Filter tahun opsional (mis. ?tahun=2026) — hanya angka valid yang diterima.
    const raw = req.query.tahun;
    let tahun: number | undefined;

    if (raw !== undefined && raw !== "") {
      const parsed = Number(raw);

      if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) {
        throw new HttpError(
          "Query tahun harus berupa angka tahun yang valid (mis. 2026).",
          400,
        );
      }

      tahun = parsed;
    }

    const data = await getAdminDashboardData(tahun);

    return res.status(200).json({
      message: "Success",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil data dashboard.",
    });
  }
};

// =============================================
// Dashboard KKM
// =============================================

export const getKkmDashboardController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const raw = req.query.periode_id;

    let periodeId: number | undefined;

    if (raw !== undefined && raw !== "") {
      const parsed = Number(raw);

      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new HttpError("Query periode_id harus berupa angka yang valid.", 400);
      }

      periodeId = parsed;
    }

    const data = await getKkmDashboardData(periodeId);

    return res.status(200).json({
      message: "Dashboard KKM berhasil diambil.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil dashboard KKM.",
    });
  }
};
