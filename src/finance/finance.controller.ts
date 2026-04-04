import { Request, Response } from "express";
import { HttpError } from "../common/errors/http-error";
import {
  disburseProject,
  getFinanceProjects,
  getSummary,
} from "./finance.service";

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
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat mengambil ringkasan anggaran.",
    });
  }
};

export const getFinanceProjectsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const projects = await getFinanceProjects();

    return res.status(200).json({
      message: "Daftar proyek keuangan berhasil diambil.",
      data: projects,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil daftar proyek.",
    });
  }
};

export const disburseProjectController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const projectId = Number(req.params.id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "id harus berupa angka bulat positif.",
      });
    }

    const { realized_amount } = req.body as {
      realized_amount: number;
    };

    if (!Number.isFinite(realized_amount) || realized_amount <= 0) {
      return res.status(400).json({
        message: "realized_amount harus berupa angka positif.",
      });
    }

    const updated = await disburseProject(projectId, realized_amount);

    return res.status(200).json({
      message: "Dana proyek berhasil dicairkan.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mencairkan dana proyek.",
    });
  }
};
