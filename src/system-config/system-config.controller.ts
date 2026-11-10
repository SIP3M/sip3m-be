import { Request, Response } from "express";
import { HttpError } from "../common/errors/http-error";
import * as systemConfigService from "./system-config.service";

const handleError = (error: unknown, res: Response) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error("[system-config.controller]", error);
  return res.status(500).json({ message: "Terjadi kesalahan pada server." });
};

/** GET /system-config/google — status + kredensial (secret ter-mask). */
export const getGoogleOAuthController = async (_req: Request, res: Response) => {
  try {
    const data = await systemConfigService.getGoogleOAuthView();
    return res.status(200).json({
      message: "Konfigurasi login Google berhasil diambil.",
      data,
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/** PUT /system-config/google — simpan/ganti kredensial (ADMIN_SISTEM). */
export const updateGoogleOAuthController = async (req: Request, res: Response) => {
  try {
    // Audit: catat bahwa konfigurasi sistem berubah (nilai rahasia tidak ikut
    // dicatat — hanya jejak perubahan).
    res.locals.audit = {
      modul: "Sistem",
      aksi: "UPDATE",
      objek: "Konfigurasi OAuth Google (Client ID/Secret)",
    };

    const data = await systemConfigService.saveGoogleOAuth(req.body);
    return res.status(200).json({
      message: "Konfigurasi login Google berhasil disimpan.",
      data,
    });
  } catch (error) {
    return handleError(error, res);
  }
};
