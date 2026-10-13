import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
import {
  executeGenerateController,
  getGenerateStatsController,
  getValidasiController,
  previewGenerateController,
} from "./kkm-generate.controller";

const router = Router();

// Gambar 1: Data Peserta Siap Generate (stats atas)
router.get(
  "/kkm/generate/stats",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getGenerateStatsController,
);

// Gambar 3: Validasi Data (32 desa, 47 DPL, 15 belum syarat, rekomendasi)
router.get(
  "/kkm/generate/validasi",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getValidasiController,
);

// Gambar 4: Preview Hasil Generate (dry-run, belum simpan)
router.post(
  "/kkm/generate/preview",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  previewGenerateController,
);
router.get(
  "/kkm/generate/preview",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  previewGenerateController,
);

// Execute: distribusikan peserta (1 Desa=1 Kelompok) + mass update kelompok_id
router.post(
  "/kkm/generate/execute",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  executeGenerateController,
);

export default router;
