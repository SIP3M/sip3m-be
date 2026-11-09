import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
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
  requireRole("ADMIN_SISTEM"),
  createJabatanMasterHandler,
);

// PATCH /api/kkm/jabatan-master/:id — hanya ADMIN_SISTEM
router.patch(
  "/kkm/jabatan-master/:id",
  authMiddleware,
  requireRole("ADMIN_SISTEM"),
  updateJabatanMasterHandler,
);

// DELETE /api/kkm/jabatan-master/:id — hanya ADMIN_SISTEM
router.delete(
  "/kkm/jabatan-master/:id",
  authMiddleware,
  requireRole("ADMIN_SISTEM"),
  deleteJabatanMasterHandler,
);

export default router;
