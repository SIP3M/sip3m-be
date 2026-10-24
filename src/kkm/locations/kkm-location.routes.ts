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
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.ADMIN_SISTEM]),
  getAllKkmLocationsController,
);

router.get(
  "/kkm/locations/stats",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.ADMIN_SISTEM]),
  getKkmLocationStatsController,
);

router.post(
  "/kkm/locations",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  createKkmLocationController,
);

router.get(
  "/kkm/locations/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.ADMIN_SISTEM]),
  getKkmLocationByIdController,
);

router.put(
  "/kkm/locations/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  updateKkmLocationController,
);

router.delete(
  "/kkm/locations/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  deleteKkmLocationController,
);

export default router;
