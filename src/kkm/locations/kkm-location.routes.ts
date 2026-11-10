import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  createKkmLocationController,
  deleteKkmLocationController,
  getAllKkmLocationsController,
  getKkmLocationByIdController,
  getKkmLocationStatsController,
  updateKkmLocationController,
} from "./kkm-location.controller";

const router = Router();

router.get(
  "/kkm/locations",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LOKASI_LIHAT),
  getAllKkmLocationsController,
);

router.get(
  "/kkm/locations/stats",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LOKASI_LIHAT),
  getKkmLocationStatsController,
);

router.post(
  "/kkm/locations",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LOKASI_KELOLA),
  createKkmLocationController,
);

router.get(
  "/kkm/locations/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LOKASI_LIHAT),
  getKkmLocationByIdController,
);

router.put(
  "/kkm/locations/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LOKASI_KELOLA),
  updateKkmLocationController,
);

router.delete(
  "/kkm/locations/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LOKASI_KELOLA),
  deleteKkmLocationController,
);

export default router;
