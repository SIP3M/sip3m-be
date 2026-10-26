import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
import { handleProposalUploadError } from "../../config/storage";
import { ALLOWED_UKT_MIMES } from "./kkm-pendaftaran.types";
import {
  getPendaftaranSayaController,
  upsertPendaftaranController,
} from "./kkm-pendaftaran.controller";

const router = Router();

// Upload bukti pembayaran UKT — PDF/JPG/PNG, maks 5 MB (pola multer proposal)
const uploadBuktiUkt = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_UKT_MIMES.has(file.mimetype)) {
      callback(
        new Error("Bukti pembayaran UKT harus berformat PDF, JPG, atau PNG."),
      );
      return;
    }
    callback(null, true);
  },
}).single("bukti_ukt");

// Semua endpoint khusus mahasiswa (pendaftar KKM mandiri)
const mahasiswaOnly = [authMiddleware, requireRole([ROLES.MAHASISWA])];

// /me harus dideklarasikan sebelum pola umum bila nanti ditambah path lain
router.get("/kkm/pendaftaran/me", ...mahasiswaOnly, getPendaftaranSayaController);

router.post(
  "/kkm/pendaftaran",
  ...mahasiswaOnly,
  uploadBuktiUkt,
  handleProposalUploadError,
  upsertPendaftaranController,
);

export default router;
