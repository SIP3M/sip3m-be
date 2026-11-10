import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import { getSkemaPortalController } from "./kkm-skema.controller";

const router = Router();

// ===== Portal Skema KKM (mahasiswa — admin/staff boleh preview) =====
router.get(
  "/kkm/skema",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_SKEMA_LIHAT),
  getSkemaPortalController,
);

export default router;
