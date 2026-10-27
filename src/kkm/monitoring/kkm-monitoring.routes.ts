import { Router, NextFunction, Request, Response } from "express";
import multer from "multer";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
import { MulterError } from "multer";
import {
  createLogbookEntryController,
  getLogbookEntriesController,
  getLogbookSayaController,
  getMonitoringListController,
  markMonitoredController,
  reviewLogbookEntryController,
} from "./kkm-monitoring.controller";
import { requireDplAktif } from "../dpl/kkm-dpl.middleware";

const router = Router();

// ===== Monitoring KKM (ADMIN + STAFF; DOSEN/DPL hanya kelompok bimbingannya) =====
router.get(
  "/kkm/monitoring",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.DOSEN]),
  getMonitoringListController,
);

// ===== Logbook mahasiswa: "logbook saya" (GET) =====
router.get(
  "/kkm/logbook/me",
  authMiddleware,
  requireRole([ROLES.MAHASISWA]),
  getLogbookSayaController,
);

// ===== Logbook kelompok (mahasiswa anggota / DPL) =====
router.get(
  "/kkm/kelompok/:id/logbook",
  authMiddleware,
  requireRole([ROLES.MAHASISWA, ROLES.DOSEN, ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  requireDplAktif,
  getLogbookEntriesController,
);

// Upload file logbook PDF (opsional), maks 10 MB
const uploadLogbookPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("File logbook harus berformat PDF."));
      return;
    }
    callback(null, true);
  },
}).single("file");

const handleLogbookUploadError = (
  err: Error | null,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Ukuran file logbook terlalu besar. Maksimal 10 MB." });
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

router.post(
  "/kkm/kelompok/:id/logbook",
  authMiddleware,
  requireRole([ROLES.MAHASISWA, ROLES.DOSEN]),
  requireDplAktif,
  uploadLogbookPdf,
  handleLogbookUploadError,
  createLogbookEntryController,
);

// Review logbook (DPL kelompok / admin LPPM)
router.patch(
  "/kkm/kelompok/:id/logbook/:entryId/review",
  authMiddleware,
  requireRole([ROLES.DOSEN, ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  requireDplAktif,
  reviewLogbookEntryController,
);

// ===== Monitoring DPL (tandai "sudah monitoring") =====
router.post(
  "/kkm/kelompok/:id/monitoring",
  authMiddleware,
  requireRole([ROLES.DOSEN, ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  requireDplAktif,
  markMonitoredController,
);

export default router;
