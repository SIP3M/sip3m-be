import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import {
  exportExcelController,
  exportPdfController,
  exportProposalsExcelController,
} from "./export.controller";

const router = Router();

router.get(
  "/pengabdian/export/excel",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_EXPORT),
  exportExcelController,
);

router.get(
  "/proposals/export/excel",
  authMiddleware,
  requirePermission(PERMISSIONS.PROPOSAL_EXPORT),
  exportProposalsExcelController,
);

router.get(
  "/pengabdian/export/pdf",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGABDIAN_EXPORT),
  exportPdfController,
);

export default router;
