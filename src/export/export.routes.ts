import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";
import {
  exportExcelController,
  exportPdfController,
} from "./export.controller";

const router = Router();

router.get(
  "/pengabdian/export/excel",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  exportExcelController,
);

router.get(
  "/pengabdian/export/pdf",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  exportPdfController,
);

export default router;
