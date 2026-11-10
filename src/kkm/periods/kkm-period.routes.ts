import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  activateKkmPeriodController,
  createKkmPeriodController,
  getActiveKkmPeriodController,
  getAllKkmPeriodsController,
  getKkmPeriodByIdController,
  runAutoCompleteController,
  updateKkmPeriodController,
  updateKkmPeriodStatusController,
} from "./kkm-period.controller";

const router = Router();

// List & active (specific paths before :id)
router.get(
  "/kkm/periods",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PERIODE_LIHAT),
  getAllKkmPeriodsController,
);

router.get(
  "/kkm/periods/active",
  authMiddleware,
  getActiveKkmPeriodController,
);

// Create
router.post(
  "/kkm/periods",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PERIODE_KELOLA),
  createKkmPeriodController,
);

// Cron manual trigger (admin only)
router.post(
  "/kkm/periods/run-auto-complete",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PERIODE_KELOLA),
  runAutoCompleteController,
);

// Detail / update by id — baca dibuka utk mahasiswa (formulir pendaftaran
// memuat info periode; sebelumnya 403 & form tak bisa tampil), tulis tetap admin
router.get(
  "/kkm/periods/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PERIODE_DETAIL),
  getKkmPeriodByIdController,
);

router.put(
  "/kkm/periods/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PERIODE_KELOLA),
  updateKkmPeriodController,
);

router.patch(
  "/kkm/periods/:id/activate",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PERIODE_KELOLA),
  activateKkmPeriodController,
);

router.patch(
  "/kkm/periods/:id/status",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PERIODE_KELOLA),
  updateKkmPeriodStatusController,
);

export default router;
