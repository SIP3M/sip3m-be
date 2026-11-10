import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import {
  getDashboardController,
  getDetailController,
} from "./monitoring.controller";

const router = Router();

router.get(
  "/monitoring/projects",
  authMiddleware,
  requirePermission(PERMISSIONS.MONITORING_PROYEK_LIHAT),
  getDashboardController,
);

router.get(
  "/monitoring/projects/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.MONITORING_PROYEK_LIHAT),
  getDetailController,
);

export default router;
