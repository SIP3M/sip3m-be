import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import { ROLES } from "../../auth/role";
import {
  kkmLogbookCreateSchema,
  kkmMonitoringMarkSchema,
  kkmMonitoringQuerySchema,
} from "./kkm-monitoring.validation";
import {
  createLogbookEntry,
  getLogbookEntries,
  getMonitoringList,
  markMonitored,
} from "./kkm-monitoring.service";

const parseIdParam = (raw: string | string[]): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id) || id <= 0) throw new HttpError("ID tidak valid.", 400);
  return id;
};

export const getMonitoringListController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmMonitoringQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }

    const role = req.user.role ?? req.user.roles;
    // DOSEN (DPL) hanya boleh melihat kelompok bimbingannya sendiri —
    // dpl_id dipaksa di server, query param dari FE diabaikan.
    const data = await getMonitoringList(
      role === ROLES.DOSEN
        ? { ...parsed.data, dpl_id: Number(req.user.userId) }
        : parsed.data,
    );
    return res.status(200).json({ message: "Berhasil mengambil monitoring KKM.", ...data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_KKM_MONITORING_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil monitoring KKM." });
  }
};

export const getLogbookEntriesController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.id);
    const data = await getLogbookEntries(id);
    return res.status(200).json({ message: "Berhasil mengambil entri logbook kelompok.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_LOGBOOK_ENTRIES_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil entri logbook." });
  }
};

export const createLogbookEntryController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role ?? req.user?.roles;
    if (!userId || !role) throw new HttpError("Unauthorized", 401);

    const id = parseIdParam(req.params.id);
    const parsed = kkmLogbookCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await createLogbookEntry(id, parsed.data, Number(userId), role);
    return res.status(201).json({ message: "Entri logbook berhasil ditambahkan.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[CREATE_LOGBOOK_ENTRY_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat menambah entri logbook." });
  }
};

export const markMonitoredController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role ?? req.user?.roles;
    if (!userId || !role) throw new HttpError("Unauthorized", 401);

    const id = parseIdParam(req.params.id);
    const parsed = kkmMonitoringMarkSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await markMonitored(id, parsed.data, Number(userId), role);
    return res.status(200).json({ message: "Monitoring kelompok berhasil dicatat.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[MARK_MONITORED_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mencatat monitoring." });
  }
};
