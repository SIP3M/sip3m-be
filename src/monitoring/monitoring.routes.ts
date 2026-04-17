import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";
import {
  getDashboardController,
  getDetailController,
} from "./monitoring.controller";

const router = Router();

router.get(
  "/monitoring/projects",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  getDashboardController,
);

router.get(
  "/monitoring/projects/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  getDetailController,
);

export default router;
