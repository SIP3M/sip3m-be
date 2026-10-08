import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  createKkmLocationSchema,
  kkmLocationQuerySchema,
  updateKkmLocationSchema,
} from "./kkm-location.validation";
import {
  createKkmLocation,
  deleteKkmLocation,
  getAllKkmLocations,
  getKkmLocationById,
  getKkmLocationStats,
  updateKkmLocation,
} from "./kkm-location.service";

export const createKkmLocationController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = createKkmLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const result = await createKkmLocation(parsed.data, Number(req.user.userId));
    return res.status(201).json({ message: "Lokasi KKM berhasil dibuat.", data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[CREATE_KKM_LOCATION_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server saat membuat lokasi KKM." });
  }
};

export const getAllKkmLocationsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmLocationQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const result = await getAllKkmLocations(parsed.data);
    return res.status(200).json({ message: "Berhasil mengambil daftar lokasi KKM.", ...result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_ALL_KKM_LOCATIONS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar lokasi KKM." });
  }
};

export const getKkmLocationByIdController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) return res.status(400).json({ message: "ID lokasi tidak valid." });
    const data = await getKkmLocationById(id);
    return res.status(200).json({ message: "Berhasil mengambil detail lokasi KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_KKM_LOCATION_BY_ID_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil detail lokasi KKM." });
  }
};

export const updateKkmLocationController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) return res.status(400).json({ message: "ID lokasi tidak valid." });
    const parsed = updateKkmLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const result = await updateKkmLocation(id, parsed.data);
    return res.status(200).json({ message: "Lokasi KKM berhasil diperbarui.", data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPDATE_KKM_LOCATION_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat memperbarui lokasi KKM." });
  }
};

export const deleteKkmLocationController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) return res.status(400).json({ message: "ID lokasi tidak valid." });
    const result = await deleteKkmLocation(id);
    return res.status(200).json({ message: "Lokasi KKM berhasil dihapus.", data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[DELETE_KKM_LOCATION_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat menghapus lokasi KKM." });
  }
};

export const getKkmLocationStatsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const periode_id = Number(req.query.periode_id);
    if (Number.isNaN(periode_id) || periode_id <= 0) {
      return res.status(400).json({ message: "Query periode_id wajib dan harus valid." });
    }
    const data = await getKkmLocationStats(periode_id);
    return res.status(200).json({ message: "Berhasil mengambil statistik lokasi KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_KKM_LOCATION_STATS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil statistik lokasi KKM." });
  }
};
