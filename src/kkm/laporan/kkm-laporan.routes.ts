import { Router, NextFunction, Request, Response } from "express";
import multer from "multer";
import { MulterError } from "multer";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  getLaporanIndividuController,
  getLaporanKelompokController,
  uploadLaporanIndividuController,
  uploadLaporanKelompokController,
} from "./kkm-laporan.controller";

const router = Router();

// Upload PDF laporan, maks 10 MB
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("File laporan harus berformat PDF."));
      return;
    }
    callback(null, true);
  },
}).single("file");

const handleUploadError = (
  err: Error | null,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Ukuran file laporan terlalu besar. Maksimal 10 MB." });
      return;
    }
    res.status(400).json({ message: `Upload error: ${err.message}` });
    return;
  }
  if (err) {
    res.status(400).json({ message: err.message });
    return;
  }
  next();
};

// ===== LAPORAN INDIVIDU (mahasiswa) =====
router.get(
  "/kkm/laporan/individu/me",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LAPORAN_INDIVIDU),
  getLaporanIndividuController,
);

router.post(
  "/kkm/laporan/individu",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LAPORAN_INDIVIDU),
  uploadPdf,
  handleUploadError,
  uploadLaporanIndividuController,
);

// ===== LAPORAN KELOMPOK (mahasiswa — hanya ketua/sekretaris boleh unggah) =====
router.get(
  "/kkm/laporan/kelompok/me",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LAPORAN_KELOMPOK),
  getLaporanKelompokController,
);

router.post(
  "/kkm/kelompok/:id/laporan",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LAPORAN_KELOMPOK),
  uploadPdf,
  handleUploadError,
  uploadLaporanKelompokController,
);

export default router;
