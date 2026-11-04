import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
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
  requireRole([ROLES.DOSEN]),
  getPenilaianBimbinganController,
);

router.post(
  "/kkm/dpl/penilaian",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  upsertPenilaianController,
);

router.post(
  "/kkm/dpl/penilaian/bulk",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  bulkUpsertPenilaianController,
);

// =============================================
// MAHASISWA — Lihat Nilai & Evaluasi Sendiri
// =============================================
router.get(
  "/kkm/mahasiswa/penilaian",
  authMiddleware,
  requireRole([ROLES.MAHASISWA]),
  getPenilaianMahasiswaController,
);

export default router;
