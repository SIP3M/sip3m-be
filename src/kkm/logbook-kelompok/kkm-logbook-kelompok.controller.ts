import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import { kkmLogbookKelompokUploadSchema } from "./kkm-logbook-kelompok.validation";
import {
  getLogbookKelompokSaya,
  uploadLogbookKelompok,
} from "./kkm-logbook-kelompok.service";

const parseIdParam = (raw: string | string[]): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id) || id <= 0) throw new HttpError("ID tidak valid.", 400);
  return id;
};

/** GET /kkm/logbook-kelompok/me — jadwal mingguan + riwayat milik mahasiswa. */
export const getLogbookKelompokSayaController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await getLogbookKelompokSaya(Number(req.user.userId));
    return res
      .status(200)
      .json({ message: "Berhasil mengambil logbook kelompok saya.", data });
  } catch (error) {
    if (error instanceof HttpError)
      return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_LOGBOOK_KELOMPOK_SAYA_ERROR]", error);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mengambil logbook kelompok." });
  }
};

/** POST /kkm/kelompok/:id/logbook-kelompok — unggah PDF mingguan (ketua/sekretaris). */
export const uploadLogbookKelompokController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new HttpError("Unauthorized", 401);

    const kelompokId = parseIdParam(req.params.id);
    const parsed = kkmLogbookKelompokUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await uploadLogbookKelompok(
      kelompokId,
      parsed.data,
      Number(userId),
      req.file,
    );
    return res
      .status(201)
      .json({ message: `Logbook minggu ke-${data.minggu_ke} berhasil diunggah.`, data });
  } catch (error) {
    if (error instanceof HttpError)
      return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPLOAD_LOGBOOK_KELOMPOK_ERROR]", error);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mengunggah logbook kelompok." });
  }
};
