import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import { KkmPeriodStatus } from "../../generated/prisma/enums";
import {
  createKkmPeriodSchema,
  kkmPeriodQuerySchema,
  updateKkmPeriodSchema,
  updateKkmPeriodStatusSchema,
} from "./kkm-period.validation";
import {
  activateKkmPeriod,
  autoCompleteExpiredPeriods,
  createKkmPeriod,
  getActiveKkmPeriod,
  getAllKkmPeriods,
  getKkmPeriodById,
  updateKkmPeriod,
  updateKkmPeriodStatus,
} from "./kkm-period.service";

export const createKkmPeriodController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);

    const parsed = createKkmPeriodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await createKkmPeriod(parsed.data, Number(req.user.userId));
    const isAktif = parsed.data.status === KkmPeriodStatus.AKTIF;
    return res.status(201).json({
      message: isAktif ? "Periode KKM berhasil dibuat dan diaktifkan." : "Periode KKM berhasil dibuat.",
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[CREATE_KKM_PERIOD_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server saat membuat periode KKM." });
  }
};

export const getAllKkmPeriodsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);

    const parsed = kkmPeriodQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await getAllKkmPeriods(parsed.data);
    return res.status(200).json({
      message: "Berhasil mengambil daftar periode KKM.",
      ...result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_ALL_KKM_PERIODS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server saat mengambil daftar periode KKM." });
  }
};

export const getActiveKkmPeriodController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);

    const active = await getActiveKkmPeriod();
    return res.status(200).json({
      message: active ? "Periode aktif ditemukan." : "Tidak ada periode aktif saat ini.",
      data: active,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_ACTIVE_KKM_PERIOD_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server saat mengambil periode aktif." });
  }
};

export const getKkmPeriodByIdController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);

    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ message: "ID periode tidak valid." });
    }

    const data = await getKkmPeriodById(id);
    return res.status(200).json({ message: "Berhasil mengambil detail periode KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_KKM_PERIOD_BY_ID_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server saat mengambil detail periode KKM." });
  }
};

export const updateKkmPeriodController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);

    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ message: "ID periode tidak valid." });
    }

    const parsed = updateKkmPeriodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await updateKkmPeriod(id, parsed.data);
    return res.status(200).json({ message: "Periode KKM berhasil diperbarui.", data: result });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[UPDATE_KKM_PERIOD_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server saat memperbarui periode KKM." });
  }
};

export const activateKkmPeriodController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);

    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ message: "ID periode tidak valid." });
    }

    const result = await activateKkmPeriod(id);
    return res.status(200).json({ message: "Periode KKM berhasil diaktifkan.", data: result });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[ACTIVATE_KKM_PERIOD_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server saat mengaktifkan periode KKM." });
  }
};

export const updateKkmPeriodStatusController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);

    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ message: "ID periode tidak valid." });
    }

    const parsed = updateKkmPeriodStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await updateKkmPeriodStatus(id, parsed.data.status as KkmPeriodStatus);
    return res.status(200).json({
      message: `Status periode berhasil diubah menjadi ${parsed.data.status}.`,
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[UPDATE_KKM_PERIOD_STATUS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server saat mengubah status periode KKM." });
  }
};

/** Manual trigger untuk cron (opsional, ADMIN only) */
export const runAutoCompleteController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const result = await autoCompleteExpiredPeriods();
    return res.status(200).json({
      message: `Cron selesai. ${result.count} periode diubah menjadi SELESAI.`,
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[RUN_KKM_CRON_ERROR]", error);
    return res.status(500).json({ message: "Gagal menjalankan cron periode KKM." });
  }
};
