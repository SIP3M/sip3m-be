import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  assignKelompokController,
  bulkUpdateStatusController,
  exportPesertaController,
  getAllPesertaController,
  getPesertaByIdController,
  getPesertaStatsController,
  updatePesertaStatusController,
} from "./kkm-peserta.controller";

const router = Router();

router.get(
  "/kkm/peserta/stats",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PESERTA_LIHAT),
  getPesertaStatsController,
);

router.get(
  "/kkm/peserta/export",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PESERTA_EXPORT),
  exportPesertaController,
);

router.get(
  "/kkm/peserta",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PESERTA_LIHAT),
  getAllPesertaController,
);

// BULK routes harus di atas :id agar tidak ditangkap param
router.patch(
  "/kkm/peserta/bulk-status",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PESERTA_KELOLA),
  bulkUpdateStatusController,
);

router.post(
  "/kkm/peserta/assign-kelompok",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PESERTA_KELOLA),
  assignKelompokController,
);

router.get(
  "/kkm/peserta/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PESERTA_LIHAT),
  getPesertaByIdController,
);

router.patch(
  "/kkm/peserta/:id/status",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PESERTA_KELOLA),
  updatePesertaStatusController,
);

export default router;
