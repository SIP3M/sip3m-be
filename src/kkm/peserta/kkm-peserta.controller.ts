import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  kkmPesertaQuerySchema,
  kkmPesertaStatsQuerySchema,
  kkmPesertaBulkStatusSchema,
  kkmPesertaAssignKelompokSchema,
  kkmPesertaUpdateStatusSchema,
} from "./kkm-peserta.validation";
import {
  assignKelompokBulk,
  bulkUpdateStatus,
  exportPeserta,
  getAllPeserta,
  getPesertaById,
  getPesertaStats,
  updatePesertaStatus,
} from "./kkm-peserta.service";

export const getPesertaStatsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmPesertaStatsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    const data = await getPesertaStats(parsed.data.periode_id);
    return res.status(200).json({ message: "Berhasil mengambil statistik peserta KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_PESERTA_STATS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil statistik peserta KKM." });
  }
};

export const getAllPesertaController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmPesertaQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    const result = await getAllPeserta(parsed.data);
    return res.status(200).json({ message: "Berhasil mengambil daftar peserta KKM.", ...result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_ALL_PESERTA_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar peserta KKM." });
  }
};

export const getPesertaByIdController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) return res.status(400).json({ message: "ID peserta tidak valid." });
    const data = await getPesertaById(id);
    return res.status(200).json({ message: "Berhasil mengambil detail peserta KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_PESERTA_BY_ID_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil detail peserta KKM." });
  }
};

export const bulkUpdateStatusController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmPesertaBulkStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    const result = await bulkUpdateStatus(parsed.data);
    return res.status(200).json({ message: `Berhasil update ${result.count} peserta menjadi ${parsed.data.status}.`, data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[BULK_UPDATE_PESERTA_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat bulk update peserta KKM." });
  }
};

export const assignKelompokController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmPesertaAssignKelompokSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    const result = await assignKelompokBulk(parsed.data);
    return res.status(200).json({ message: `Berhasil assign ${result.count} peserta ke kelompok.`, data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[ASSIGN_KELOMPOK_PESERTA_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat assign kelompok peserta KKM." });
  }
};

export const updatePesertaStatusController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) return res.status(400).json({ message: "ID peserta tidak valid." });
    const parsed = kkmPesertaUpdateStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    const result = await updatePesertaStatus(id, parsed.data.status as never);
    return res.status(200).json({ message: `Status peserta menjadi ${parsed.data.status}.`, data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPDATE_PESERTA_STATUS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat update status peserta KKM." });
  }
};

export const exportPesertaController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const periode_id = Number(req.query.periode_id);
    if (Number.isNaN(periode_id) || periode_id <= 0) return res.status(400).json({ message: "periode_id wajib." });
    const data = await exportPeserta(periode_id, req.query as never);
    return res.status(200).json({ message: "Berhasil export peserta KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[EXPORT_PESERTA_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat export peserta KKM." });
  }
};
