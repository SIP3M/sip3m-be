import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
import {
  addAnggotaController,
  deleteDokumenController,
  getKelompokDetailController,
  getKelompokListController,
  getKelompokSayaController,
  getKelompokStatsController,
  removeAnggotaController,
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
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getKelompokStatsController,
);

router.get(
  "/kkm/kelompok",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getKelompokListController,
);

// Mahasiswa: kelompok saya (halaman "Kelompok Saya") — HARUS sebelum /:id
router.get(
  "/kkm/kelompok/me",
  authMiddleware,
  requireRole([ROLES.MAHASISWA]),
  getKelompokSayaController,
);

router.get(
  "/kkm/kelompok/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.DOSEN]),
  getKelompokDetailController,
);

// ===== Mutations (ADMIN only) =====
router.patch(
  "/kkm/kelompok/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  updateKelompokController,
);

router.post(
  "/kkm/kelompok/:id/anggota",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  addAnggotaController,
);

router.delete(
  "/kkm/kelompok/:id/anggota/:pesertaId",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  removeAnggotaController,
);

router.post(
  "/kkm/kelompok/:id/dokumen",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  upload.single("file"),
  uploadDokumenController,
);

router.delete(
  "/kkm/kelompok/dokumen/:docId",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  deleteDokumenController,
);

export default router;
