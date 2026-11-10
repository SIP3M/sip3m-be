import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import { getAdminDashboardController, getKkmDashboardController } from "./dashboard.controller";

const router = Router();

router.get(
  "/dashboard/admin",
  authMiddleware,
  requirePermission(PERMISSIONS.DASHBOARD_ADMIN),
  getAdminDashboardController,
);

router.get(
  "/dashboard/kkm",
  authMiddleware,
  requirePermission(PERMISSIONS.DASHBOARD_KKM),
  getKkmDashboardController,
);

export default router;
