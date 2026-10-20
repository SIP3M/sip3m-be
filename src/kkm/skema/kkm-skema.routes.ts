import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
import { getSkemaPortalController } from "./kkm-skema.controller";

const router = Router();

// ===== Portal Skema KKM (mahasiswa — admin/staff boleh preview) =====
router.get(
  "/kkm/skema",
  authMiddleware,
  requireRole([ROLES.MAHASISWA, ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getSkemaPortalController,
);

export default router;
