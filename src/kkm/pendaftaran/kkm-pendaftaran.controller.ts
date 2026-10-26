import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  listPendaftaranQuerySchema,
  upsertPendaftaranSchema,
} from "./kkm-pendaftaran.validation";
import {
  getPendaftaranSaya,
  upsertPendaftaran,
} from "./kkm-pendaftaran.service";

/**
 * GET /kkm/pendaftaran/me — riwayat pendaftaran KKM milik mahasiswa login.
 * Query opsional: ?periode_id= (dipakai FE untuk status pada periode aktif).
 */
export const getPendaftaranSayaController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const userId = Number(req.user.userId);

    const parsed = listPendaftaranQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await getPendaftaranSaya(userId, parsed.data);
    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_PENDAFTARAN_ME_ERROR]", error);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mengambil data pendaftaran." });
  }
};

/**
 * POST /kkm/pendaftaran — simpan draft / kirim pendaftaran (multipart:
 * field formulir + berkas bukti_ukt opsional kecuali saat kirim).
 */
export const upsertPendaftaranController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const userId = Number(req.user.userId);

    const parsed = upsertPendaftaranSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await upsertPendaftaran(
      userId,
      parsed.data,
      req.file as Express.Multer.File | undefined,
    );

    res.locals.audit = {
      modul: "KKM",
      aksi: result.created ? "CREATE" : "UPDATE",
      objek: `Pendaftaran KKM: ${result.row.periode?.nama_periode ?? result.row.periode_id} (${result.row.status})`,
      objekId: result.row.id,
    };

    return res
      .status(result.created ? 201 : 200)
      .json({ message: result.message, data: result.row });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[UPSERT_PENDAFTARAN_ERROR]", error);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan saat menyimpan pendaftaran." });
  }
};
