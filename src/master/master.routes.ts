import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";
import {
  createFakultasController,
  createProgramStudiController,
  deleteFakultasController,
  deleteProgramStudiController,
  getAllProgramStudiController,
  getFakultasController,
  getProgramStudiController,
  updateFakultasController,
  updateProgramStudiController,
} from "./master.controller";

const router = Router();

// Read-only (publik — dipakai dropdown AddUser/EditUser/proposal)
router.get("/fakultas", getFakultasController);
router.get("/fakultas/:fakultasId/program-studi", getProgramStudiController);
// Seluruh prodi (dipakai halaman Kelola Program Studi datar)
router.get("/program-studi", getAllProgramStudiController);

// =============================================
// Kelola master data — HANYA ADMIN_SISTEM
// =============================================
const adminSistemOnly = [authMiddleware, requireRole([ROLES.ADMIN_SISTEM])];

router.post("/fakultas", ...adminSistemOnly, createFakultasController);
router.patch("/fakultas/:fakultasId", ...adminSistemOnly, updateFakultasController);
router.delete("/fakultas/:fakultasId", ...adminSistemOnly, deleteFakultasController);

router.post(
  "/fakultas/:fakultasId/program-studi",
  ...adminSistemOnly,
  createProgramStudiController,
);
router.patch(
  "/program-studi/:programStudiId",
  ...adminSistemOnly,
  updateProgramStudiController,
);
router.delete(
  "/program-studi/:programStudiId",
  ...adminSistemOnly,
  deleteProgramStudiController,
);

export default router;
