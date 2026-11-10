import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requirePermission } from "../../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../../auth/permission";
import {
  getAllJabatanMasterHandler,
  getJabatanMasterByIdHandler,
  createJabatanMasterHandler,
  updateJabatanMasterHandler,
  deleteJabatanMasterHandler,
} from "./jabatan-master.controller";

const router = Router();

// GET /api/kkm/jabatan-master — list semua jabatan
router.get(
  "/kkm/jabatan-master",
  authMiddleware,
  getAllJabatanMasterHandler,
);

// GET /api/kkm/jabatan-master/:id
router.get(
  "/kkm/jabatan-master/:id",
  authMiddleware,
  getJabatanMasterByIdHandler,
);

// POST /api/kkm/jabatan-master — hanya ADMIN_SISTEM
router.post(
  "/kkm/jabatan-master",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_JABATAN_KELOLA),
  createJabatanMasterHandler,
);

// PATCH /api/kkm/jabatan-master/:id — hanya ADMIN_SISTEM
router.patch(
  "/kkm/jabatan-master/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_JABATAN_KELOLA),
  updateJabatanMasterHandler,
);

// DELETE /api/kkm/jabatan-master/:id — hanya ADMIN_SISTEM
router.delete(
  "/kkm/jabatan-master/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KKM_JABATAN_KELOLA),
  deleteJabatanMasterHandler,
);

export default router;
