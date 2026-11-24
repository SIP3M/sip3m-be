import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { validate } from "../common/middleware/validate";
import { PERMISSIONS } from "../auth/permission";
import {
  approveProjectFundingController,
  disburseProjectController,
  exportFinanceExcelController,
  getFinanceProjectDetailController,
  getFinanceProjectsController,
  getFinanceSummaryController,
} from "./finance.controller";
import { disburseProjectSchema } from "./finance.validation";
import { financeUpload, handleFinanceUploadError } from "./finance.upload";

const router = Router();

router.get(
  "/finances/summary",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_LIHAT),
  getFinanceSummaryController,
);

router.get(
  "/finances/export/excel",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_EXPORT),
  exportFinanceExcelController,
);

router.get(
  "/finances/projects",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_LIHAT),
  getFinanceProjectsController,
);

router.get(
  "/finances/projects/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_LIHAT),
  getFinanceProjectDetailController,
);

// KETUA_LPPM: setujui anggaran proyek sebelum pencairan dapat diinput.
router.patch(
  "/finances/projects/:id/approve",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_SETUJUI),
  approveProjectFundingController,
);

// KEUANGAN: input/edit nominal dana cair + catatan + bukti transfer (opsional).
router.patch(
  "/finances/projects/:id/disburse",
  authMiddleware,
  requirePermission(PERMISSIONS.KEUANGAN_CAIKAN),
  financeUpload.single("transfer_proof"),
  handleFinanceUploadError,
  validate(disburseProjectSchema),
  disburseProjectController,
);

export default router;
