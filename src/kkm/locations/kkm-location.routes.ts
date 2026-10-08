import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
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
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getAllKkmLocationsController,
);

router.get(
  "/kkm/locations/stats",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getKkmLocationStatsController,
);

router.post(
  "/kkm/locations",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  createKkmLocationController,
);

router.get(
  "/kkm/locations/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getKkmLocationByIdController,
);

router.put(
  "/kkm/locations/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  updateKkmLocationController,
);

router.delete(
  "/kkm/locations/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  deleteKkmLocationController,
);

export default router;
