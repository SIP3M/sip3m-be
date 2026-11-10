import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { validate } from "../common/middleware/validate";
import { PERMISSIONS } from "../auth/permission";
import {
  disburseProjectController,
  getFinanceProjectsController,
  getFinanceSummaryController,
} from "./finance.controller";
import { disburseProjectSchema } from "./finance.validation";

const router = Router();

router.get(
  "/finances/summary",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_LIHAT),
  getFinanceSummaryController,
);

router.get(
  "/finances/projects",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_LIHAT),
  getFinanceProjectsController,
);

router.patch(
  "/finances/projects/:id/disburse",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_CAIKAN),
  validate(disburseProjectSchema),
  disburseProjectController,
);

export default router;
