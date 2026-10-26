import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";
import { getAuditLogs, exportAuditLogs } from "./audit.controller";

const router = Router();

// Audit log hanya untuk ADMIN_SISTEM
router.get(
  "/audit-logs",
  authMiddleware,
  requireRole([ROLES.ADMIN_SISTEM]),
  getAuditLogs,
);

router.get(
  "/audit-logs/export",
  authMiddleware,
  requireRole([ROLES.ADMIN_SISTEM]),
  exportAuditLogs,
);

export default router;
