import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
import {
  createLogbookEntryController,
  getLogbookEntriesController,
  getMonitoringListController,
  markMonitoredController,
} from "./kkm-monitoring.controller";
import { requireDplAktif } from "../dpl/kkm-dpl.middleware";

const router = Router();

// ===== Monitoring KKM (ADMIN + STAFF) =====
router.get(
  "/kkm/monitoring",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getMonitoringListController,
);

// ===== Logbook kelompok (mahasiswa anggota / DPL) =====
router.get(
  "/kkm/kelompok/:id/logbook",
  authMiddleware,
  requireRole([ROLES.MAHASISWA, ROLES.DOSEN, ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  requireDplAktif,
  getLogbookEntriesController,
);

router.post(
  "/kkm/kelompok/:id/logbook",
  authMiddleware,
  requireRole([ROLES.MAHASISWA, ROLES.DOSEN]),
  requireDplAktif,
  createLogbookEntryController,
);

// ===== Monitoring DPL (tandai "sudah monitoring") =====
router.post(
  "/kkm/kelompok/:id/monitoring",
  authMiddleware,
  requireRole([ROLES.DOSEN, ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  requireDplAktif,
  markMonitoredController,
);

export default router;
