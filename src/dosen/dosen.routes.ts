import { Router } from "express";
import { getProfile, updateProfile, searchDosenController, searchMahasiswaController } from "./dosen.controller";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";

const router = Router();

router.get(
  "/dosen/profile",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  getProfile,
);

router.patch(
  "/dosen/profile",
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  updateProfile,
);

/**
 * GET /dosen/search?q=:query
 * Search dosen by nama atau NIDN (public endpoint, perlu auth)
 */
router.get(
  "/dosen/search",
  authMiddleware,
  searchDosenController,
);

/**
 * GET /mahasiswa/search?q=:query
 * Search mahasiswa by nama atau NIM (public endpoint, perlu auth)
 */
router.get(
  "/mahasiswa/search",
  authMiddleware,
  searchMahasiswaController,
);

export default router;
