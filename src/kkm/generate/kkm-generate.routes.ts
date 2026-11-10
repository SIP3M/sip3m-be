import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
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
  requirePermission(PERMISSIONS.KKM_GENERATE_LIHAT),
  getGenerateStatsController,
);

// Gambar 3: Validasi Data (32 desa, 47 DPL, 15 belum syarat, rekomendasi)
router.get(
  "/kkm/generate/validasi",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_GENERATE_LIHAT),
  getValidasiController,
);

// Gambar 4: Preview Hasil Generate (dry-run, belum simpan)
router.post(
  "/kkm/generate/preview",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_GENERATE_LIHAT),
  previewGenerateController,
);
router.get(
  "/kkm/generate/preview",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_GENERATE_LIHAT),
  previewGenerateController,
);

// Execute: distribusikan peserta (1 Desa=1 Kelompok) + mass update kelompok_id
router.post(
  "/kkm/generate/execute",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_GENERATE_JALANKAN),
  executeGenerateController,
);

export default router;
