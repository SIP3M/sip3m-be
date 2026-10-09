import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  kkmDplListQuerySchema,
  kkmDplStatsQuerySchema,
  kkmDplDosenQuerySchema,
  kkmDplKelompokQuerySchema,
  kkmDplAssignSchema,
  kkmDplCabutSchema,
  kkmKelompokGenerateSchema,
} from "./kkm-dpl.validation";
import {
  assignDpl,
  cabutDpl,
  generateKelompokFromLokasi,
  getDplList,
  getDplStats,
  getKelompokForAssign,
  isDplAktif,
  searchDosen,
} from "./kkm-dpl.service";

export const getDplListController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmDplListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const result = await getDplList(parsed.data);
    return res.status(200).json({ message: "Berhasil mengambil daftar DPL KKM.", ...result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_DPL_LIST_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar DPL KKM." });
  }
};

export const getDplStatsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmDplStatsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await getDplStats(parsed.data.periode_id);
    return res.status(200).json({ message: "Berhasil mengambil statistik DPL KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_DPL_STATS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil statistik DPL KKM." });
  }
};

export const searchDosenController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmDplDosenQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await searchDosen(parsed.data.search, parsed.data.limit ?? 20);
    return res.status(200).json({ message: "Berhasil mencari dosen.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[SEARCH_DOSEN_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mencari dosen." });
  }
};

export const getKelompokForAssignController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmDplKelompokQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await getKelompokForAssign(parsed.data as never);
    return res.status(200).json({ message: "Berhasil mengambil daftar kelompok.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_KELOMPOK_ASSIGN_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar kelompok." });
  }
};

export const assignDplController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmDplAssignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const result = await assignDpl(parsed.data);
    return res.status(200).json({ message: "DPL berhasil ditugaskan.", data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[ASSIGN_DPL_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat menugaskan DPL." });
  }
};

export const cabutDplController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmDplCabutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const result = await cabutDpl(parsed.data);
    return res.status(200).json({ message: "Tugas DPL berhasil dicabut.", data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[CABUT_DPL_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mencabut tugas DPL." });
  }
};

export const generateKelompokController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmKelompokGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const result = await generateKelompokFromLokasi(parsed.data.periode_id);
    return res.status(200).json({ message: `${result.created} kelompok berhasil dibuat.`, data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GENERATE_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat generate kelompok." });
  }
};

export const getMyDplStatusController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const userId = Number(req.user.userId);
    const result = await isDplAktif(userId);
    return res.status(200).json({ message: "Berhasil cek status DPL.", data: { is_dpl_aktif: result, user_id: userId } });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_MY_DPL_STATUS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat cek status DPL." });
  }
};
