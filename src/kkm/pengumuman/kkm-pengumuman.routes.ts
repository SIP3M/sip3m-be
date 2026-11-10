import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  LAMPIRAN_ALLOWED_MIME,
  LAMPIRAN_MAX_BYTES,
  LAMPIRAN_MIME_ERROR,
} from "./kkm-pengumuman.types";
import {
  createPengumumanController,
  deletePengumumanController,
  getPengumumanDetailController,
  getPengumumanForUserController,
  listPengumumanController,
  listPengumumanForUserController,
  markPengumumanReadController,
  publishPengumumanController,
  togglePinController,
  updatePengumumanController,
} from "./kkm-pengumuman.controller";

const router = Router();

// Lampiran: PDF / JPG / PNG / DOCX, maksimal 10 MB (multipart `lampiran`)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LAMPIRAN_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!(LAMPIRAN_ALLOWED_MIME as readonly string[]).includes(file.mimetype)) {
      cb(new Error(LAMPIRAN_MIME_ERROR));
      return;
    }
    cb(null, true);
  },
});

/** Bungkus multer supaya error ukuran/tipe file tetap respons JSON (bukan HTML). */
const uploadLampiran = (req: Request, res: Response, next: NextFunction) => {
  upload.single("lampiran")(req, res, (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Lampiran maksimal 10 MB."
          : err.message || "Gagal mengunggah lampiran.";
      res.status(400).json({ message });
      return;
    }
    next();
  });
};

// =============================================
// ADMIN — kelola pengumuman (baca terbuka utk staff/sistem)
// =============================================
router.get(
  "/kkm/pengumuman",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENGUMUMAN_LIHAT),
  listPengumumanController,
);

router.post(
  "/kkm/pengumuman",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENGUMUMAN_KELOLA),
  uploadLampiran,
  createPengumumanController,
);

router.get(
  "/kkm/pengumuman/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENGUMUMAN_LIHAT),
  getPengumumanDetailController,
);

router.patch(
  "/kkm/pengumuman/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENGUMUMAN_KELOLA),
  updatePengumumanController,
);

router.patch(
  "/kkm/pengumuman/:id/pin",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENGUMUMAN_KELOLA),
  togglePinController,
);

router.patch(
  "/kkm/pengumuman/:id/publish",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENGUMUMAN_KELOLA),
  publishPengumumanController,
);

router.delete(
  "/kkm/pengumuman/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_PENGUMUMAN_KELOLA),
  deletePengumumanController,
);

// =============================================
// PENERIMA — daftar pengumuman yang menyasar saya
// =============================================
router.get("/pengumuman", authMiddleware, listPengumumanForUserController);

router.get("/pengumuman/:id", authMiddleware, getPengumumanForUserController);

router.post(
  "/pengumuman/:id/read",
  authMiddleware,
  markPengumumanReadController,
);

export default router;
