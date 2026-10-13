import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
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
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getPesertaStatsController,
);

router.get(
  "/kkm/peserta/export",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  exportPesertaController,
);

router.get(
  "/kkm/peserta",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getAllPesertaController,
);

router.get(
  "/kkm/peserta/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getPesertaByIdController,
);

router.patch(
  "/kkm/peserta/bulk-status",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  bulkUpdateStatusController,
);

router.post(
  "/kkm/peserta/assign-kelompok",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  assignKelompokController,
);

router.patch(
  "/kkm/peserta/:id/status",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  updatePesertaStatusController,
);

export default router;
