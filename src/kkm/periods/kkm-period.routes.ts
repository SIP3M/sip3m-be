import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../auth/middleware/role.middleware";
import { ROLES } from "../../auth/role";
import {
  activateKkmPeriodController,
  createKkmPeriodController,
  getActiveKkmPeriodController,
  getAllKkmPeriodsController,
  getKkmPeriodByIdController,
  runAutoCompleteController,
  updateKkmPeriodController,
  updateKkmPeriodStatusController,
} from "./kkm-period.controller";

const router = Router();

// List & active (specific paths before :id)
router.get(
  "/kkm/periods",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getAllKkmPeriodsController,
);

router.get(
  "/kkm/periods/active",
  authMiddleware,
  getActiveKkmPeriodController,
);

// Create
router.post(
  "/kkm/periods",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  createKkmPeriodController,
);

// Cron manual trigger (admin only)
router.post(
  "/kkm/periods/run-auto-complete",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  runAutoCompleteController,
);

// Detail / update by id
router.get(
  "/kkm/periods/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getKkmPeriodByIdController,
);

router.put(
  "/kkm/periods/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  updateKkmPeriodController,
);

router.patch(
  "/kkm/periods/:id/activate",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  activateKkmPeriodController,
);

router.patch(
  "/kkm/periods/:id/status",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  updateKkmPeriodStatusController,
);

export default router;
