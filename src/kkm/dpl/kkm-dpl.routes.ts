import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  assignDplController,
  cabutDplController,
  generateKelompokController,
  getDplListController,
  getDplStatsController,
  getKelompokForAssignController,
  getMyDplStatusController,
  searchDosenController,
} from "./kkm-dpl.controller";

const router = Router();

// List & stats
router.get(
  "/kkm/dpl",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_DPL_LIHAT),
  getDplListController,
);

router.get(
  "/kkm/dpl/stats",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_DPL_LIHAT),
  getDplStatsController,
);

router.get(
  "/kkm/dpl/dosen",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_DPL_KELOLA),
  searchDosenController,
);

router.get(
  "/kkm/dpl/kelompok",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_DPL_KELOLA),
  getKelompokForAssignController,
);

router.get(
  "/kkm/dpl/me",
  authMiddleware,
  getMyDplStatusController,
);

// Mutations
router.post(
  "/kkm/dpl/assign",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_DPL_KELOLA),
  assignDplController,
);

router.post(
  "/kkm/dpl/cabut",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_DPL_KELOLA),
  cabutDplController,
);

router.post(
  "/kkm/kelompok/generate",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_GENERATE_JALANKAN),
  generateKelompokController,
);

export default router;
