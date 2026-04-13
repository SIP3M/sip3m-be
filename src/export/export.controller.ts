import { Request, Response } from "express";
import { HttpError } from "../common/errors/http-error";
import { exportPengabdianExcel, exportPengabdianPdf } from "./export.service";

export const exportExcelController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const buffer = await exportPengabdianExcel();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Rekap_Pengabdian.xlsx"',
    );

    return res.status(200).send(buffer);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat export Excel.",
    });
  }
};

export const exportPdfController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const buffer = await exportPengabdianPdf();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Rekap_Pengabdian.pdf"',
    );

    return res.status(200).send(buffer);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat export PDF.",
    });
  }
};
