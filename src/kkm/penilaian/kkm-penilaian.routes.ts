import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  bulkUpsertPenilaianController,
  getPenilaianBimbinganController,
  getPenilaianMahasiswaController,
  upsertPenilaianController,
} from "./kkm-penilaian.controller";

const router = Router();

// =============================================
// DPL — Kelola / Input Penilaian Mahasiswa Bimbingan
// =============================================
router.get(
  "/kkm/dpl/penilaian",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENILAIAN_ISI),
  getPenilaianBimbinganController,
);

router.post(
  "/kkm/dpl/penilaian",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENILAIAN_ISI),
  upsertPenilaianController,
);

router.post(
  "/kkm/dpl/penilaian/bulk",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENILAIAN_ISI),
  bulkUpsertPenilaianController,
);

// =============================================
// MAHASISWA — Lihat Nilai & Evaluasi Sendiri
// =============================================
router.get(
  "/kkm/mahasiswa/penilaian",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENILAIAN_LIHAT),
  getPenilaianMahasiswaController,
);

export default router;
