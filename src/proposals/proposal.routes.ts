import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { uploadMiddleware } from "../config/storage";
import {
  createProposalController,
  getAllProposalsController,
  getProposalByIdController,
} from "./proposal.controller";
import { ROLES } from "../auth/role";

const router = Router();

router.post(
  "/proposals",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  uploadMiddleware.fields([
    { name: "proposal_file", maxCount: 1 },
    { name: "rab_file", maxCount: 1 },
  ]),
  createProposalController,
);

router.get(
  "/getAllProposals",
  authMiddleware,
  requireRole([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  getAllProposalsController,
);

router.get(
  "/proposals/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.REVIEWER]),
  getProposalByIdController,
);

export default router;
