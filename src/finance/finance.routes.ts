import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { validate } from "../common/middleware/validate";
import { ROLES } from "../auth/role";
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
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getFinanceSummaryController,
);

router.get(
  "/finances/projects",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getFinanceProjectsController,
);

router.patch(
  "/finances/projects/:id/disburse",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  validate(disburseProjectSchema),
  disburseProjectController,
);

export default router;
