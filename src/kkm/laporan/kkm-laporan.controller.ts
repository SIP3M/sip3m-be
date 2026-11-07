import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  getLaporanIndividuSaya,
  getLaporanKelompokSaya,
  uploadLaporanIndividu,
  uploadLaporanKelompok,
} from "./kkm-laporan.service";

const parseIdParam = (raw: string | string[]): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id) || id <= 0) throw new HttpError("ID tidak valid.", 400);
  return id;
};

// =============================================
// LAPORAN INDIVIDU
// =============================================

export const getLaporanIndividuController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await getLaporanIndividuSaya(Number(req.user.userId));
    return res.status(200).json({ message: "Berhasil mengambil laporan individu.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_LAPORAN_INDIVIDU_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil laporan individu." });
  }
};

export const uploadLaporanIndividuController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new HttpError("Unauthorized", 401);
    const data = await uploadLaporanIndividu(Number(userId), req.file);
    return res.status(201).json({ message: "Laporan individu berhasil diunggah.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPLOAD_LAPORAN_INDIVIDU_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengunggah laporan individu." });
  }
};

// =============================================
// LAPORAN KELOMPOK
// =============================================

export const getLaporanKelompokController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await getLaporanKelompokSaya(Number(req.user.userId));
    return res.status(200).json({ message: "Berhasil mengambil laporan kelompok.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_LAPORAN_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil laporan kelompok." });
  }
};

export const uploadLaporanKelompokController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new HttpError("Unauthorized", 401);
    const kelompokId = parseIdParam(req.params.id);
    const data = await uploadLaporanKelompok(kelompokId, Number(userId), req.file);
    return res.status(201).json({ message: "Laporan kelompok berhasil diunggah.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPLOAD_LAPORAN_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengunggah laporan kelompok." });
  }
};
