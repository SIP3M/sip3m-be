import { Router, NextFunction, Request, Response } from "express";
import multer from "multer";
import { MulterError } from "multer";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  getLogbookKelompokSayaController,
  uploadLogbookKelompokController,
} from "./kkm-logbook-kelompok.controller";

const router = Router();

// Upload PDF logbook kelompok, maks 10 MB
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("File logbook kelompok harus berformat PDF."));
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
      res
        .status(400)
        .json({ message: "Ukuran file logbook kelompok terlalu besar. Maksimal 10 MB." });
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

// ===== Logbook Kelompok (mahasiswa) =====
// Jadwal mingguan + riwayat (semua anggota boleh melihat;
// hanya ketua/sekretaris yang boleh mengunggah — dicek di service).
router.get(
  "/kkm/logbook-kelompok/me",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LOGBOOK_KELOMPOK_KIRIM),
  getLogbookKelompokSayaController,
);

router.post(
  "/kkm/kelompok/:id/logbook-kelompok",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_LOGBOOK_KELOMPOK_KIRIM),
  uploadPdf,
  handleUploadError,
  uploadLogbookKelompokController,
);

export default router;
