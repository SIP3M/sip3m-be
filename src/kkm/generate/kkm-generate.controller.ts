import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import { kkmGenerateConfigSchema, kkmGenerateStatsQuerySchema } from "./kkm-generate.validation";
import { executeGenerate, getGenerateStats, getValidasi, previewGenerate } from "./kkm-generate.service";

export const getGenerateStatsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmGenerateStatsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    const data = await getGenerateStats(parsed.data.periode_id);
    return res.status(200).json({ message: "Berhasil mengambil statistik generate KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_GENERATE_STATS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil statistik generate KKM." });
  }
};

export const getValidasiController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmGenerateStatsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    const jumlah = req.query.jumlah_anggota_per_kelompok ? Number(req.query.jumlah_anggota_per_kelompok) : 10;
    const data = await getValidasi(parsed.data.periode_id, jumlah);
    return res.status(200).json({ message: "Berhasil mengambil validasi generate KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_VALIDASI_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil validasi generate KKM." });
  }
};

export const previewGenerateController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    // support GET query atau POST body
    const input = req.method === "GET" ? kkmGenerateConfigSchema.safeParse(req.query) : kkmGenerateConfigSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Validasi config gagal.", errors: input.error.flatten().fieldErrors });
    const data = await previewGenerate(input.data);
    return res.status(200).json({ message: "Berhasil preview generate KKM (dry-run, belum disimpan).", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[PREVIEW_GENERATE_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat preview generate KKM." });
  }
};

export const executeGenerateController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmGenerateConfigSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validasi config gagal.", errors: parsed.error.flatten().fieldErrors });
    const data = await executeGenerate(parsed.data, req.user.userId);
    return res.status(200).json({ message: `Berhasil generate: ${data.updated} peserta didistribusikan ke ${data.preview.total_kelompok} kelompok.`, data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[EXECUTE_GENERATE_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat execute generate KKM." });
  }
};
