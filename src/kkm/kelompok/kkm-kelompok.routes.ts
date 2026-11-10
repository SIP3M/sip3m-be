import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  addAnggotaController,
  deleteDokumenController,
  getKelompokDetailController,
  getKelompokListController,
  getKelompokSayaController,
  getKelompokStatsController,
  removeAnggotaController,
  setJabatanAnggotaController,
  updateKelompokController,
  uploadDokumenController,
} from "./kkm-kelompok.controller";

const router = Router();

// Upload dokumen: PDF saja, max 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Dokumen kelompok harus berformat PDF."));
      return;
    }
    cb(null, true);
  },
});

// List & stats (ADMIN + STAFF) — catatan: detail juga terbuka untuk DOSEN/DPL,
// dengan pemeriksaan kepemilikan (hanya DPL kelompok tersebut) di service.
router.get(
  "/kkm/kelompok/stats",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_LIHAT),
  getKelompokStatsController,
);

router.get(
  "/kkm/kelompok",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_LIHAT),
  getKelompokListController,
);

// Mahasiswa: kelompok saya (halaman "Kelompok Saya") — HARUS sebelum /:id
router.get(
  "/kkm/kelompok/me",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_SAYA),
  getKelompokSayaController,
);

router.get(
  "/kkm/kelompok/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_DETAIL),
  getKelompokDetailController,
);

// ===== Mutations (ADMIN only) =====
router.patch(
  "/kkm/kelompok/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_KELOLA),
  updateKelompokController,
);

router.post(
  "/kkm/kelompok/:id/anggota",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_KELOLA),
  addAnggotaController,
);

router.delete(
  "/kkm/kelompok/:id/anggota/:pesertaId",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_KELOLA),
  removeAnggotaController,
);

// Jabatan kelompok (KETUA / SEKRETARIS / ANGGOTA) — admin LPPM.
// Menentukan siapa yang boleh mengunggah logbook & laporan kelompok.
router.patch(
  "/kkm/kelompok/:id/anggota/:pesertaId/jabatan",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_KELOLA),
  setJabatanAnggotaController,
);

router.post(
  "/kkm/kelompok/:id/dokumen",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_KELOLA),
  upload.single("file"),
  uploadDokumenController,
);

router.delete(
  "/kkm/kelompok/dokumen/:docId",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_KELOMPOK_KELOLA),
  deleteDokumenController,
);

export default router;
