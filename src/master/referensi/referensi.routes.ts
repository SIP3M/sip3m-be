import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  createReferensiController,
  deleteReferensiController,
  getAllReferensiController,
  getReferensiAktifController,
  updateReferensiController,
} from "./referensi.controller";

const router = Router();

// Publik — opsi aktif untuk dropdown form proposal (dosen)
router.get("/referensi/:jenis", getReferensiAktifController);

// =============================================
// Kelola master referensi — HANYA ADMIN_SISTEM
// =============================================
const adminSistemOnly = [
  authMiddleware,
  requirePermission(PERMISSIONS.MASTER_REFERENSI_KELOLA),
];

router.get("/master/referensi/:jenis", ...adminSistemOnly, getAllReferensiController);
router.post("/master/referensi/:jenis", ...adminSistemOnly, createReferensiController);
router.patch(
  "/master/referensi/:referensiId",
  ...adminSistemOnly,
  updateReferensiController,
);
router.delete(
  "/master/referensi/:referensiId",
  ...adminSistemOnly,
  deleteReferensiController,
);

export default router;
