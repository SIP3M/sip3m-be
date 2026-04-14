import { Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import { getAdminDashboardData } from "./dashboard.service";

export const getAdminDashboardController = async (
  _req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const data = await getAdminDashboardData();

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
