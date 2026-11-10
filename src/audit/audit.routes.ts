import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import { getAuditLogs, exportAuditLogs } from "./audit.controller";

const router = Router();

// Audit log hanya untuk ADMIN_SISTEM (atau role yang diberi izin audit.*)
router.get(
  "/audit-logs",
  authMiddleware,
  requirePermission(PERMISSIONS.AUDIT_LIHAT),
  getAuditLogs,
);

router.get(
  "/audit-logs/export",
  authMiddleware,
  requirePermission(PERMISSIONS.AUDIT_EXPORT),
  exportAuditLogs,
);

export default router;
