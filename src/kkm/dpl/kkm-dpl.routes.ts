import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
import {
  assignDplController,
  cabutDplController,
  generateKelompokController,
  getDplListController,
  getDplStatsController,
  getKelompokForAssignController,
  getMyDplStatusController,
  searchDosenController,
} from "./kkm-dpl.controller";

const router = Router();

// List & stats
router.get(
  "/kkm/dpl",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.ADMIN_SISTEM]),
  getDplListController,
);

router.get(
  "/kkm/dpl/stats",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.ADMIN_SISTEM]),
  getDplStatsController,
);

router.get(
  "/kkm/dpl/dosen",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  searchDosenController,
);

router.get(
  "/kkm/dpl/kelompok",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  getKelompokForAssignController,
);

router.get(
  "/kkm/dpl/me",
  authMiddleware,
  getMyDplStatusController,
);

// Mutations
router.post(
  "/kkm/dpl/assign",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  assignDplController,
);

router.post(
  "/kkm/dpl/cabut",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  cabutDplController,
);

router.post(
  "/kkm/kelompok/generate",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  generateKelompokController,
);

export default router;
