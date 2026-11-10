import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import { validate } from "../common/middleware/validate";
import { updateGoogleOAuthSchema } from "./system-config.validation";
import {
  getGoogleOAuthController,
  updateGoogleOAuthController,
} from "./system-config.controller";

const router = Router();

// Pengaturan sistem — khusus pemegang izin sistem.konfigurasi
// (ADMIN_SISTEM = superuser selalu lolos).
const sistemKonfigurasi = [
  authMiddleware,
  requirePermission(PERMISSIONS.SISTEM_KONFIGURASI),
];

// Kredensial OAuth Google (Client ID/Secret) — secret tidak pernah
// dikembalikan utuh, hanya ter-mask.
router.get("/system-config/google", ...sistemKonfigurasi, getGoogleOAuthController);
router.put(
  "/system-config/google",
  ...sistemKonfigurasi,
  validate(updateGoogleOAuthSchema),
  updateGoogleOAuthController,
);

export default router;
