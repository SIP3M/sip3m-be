import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";
import { getAdminDashboardController } from "./dashboard.controller";

const router = Router();

router.get(
  "/dashboard/admin",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  getAdminDashboardController,
);

export default router;
