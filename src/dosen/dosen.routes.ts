import { Router } from "express";
import { getProfile, updateProfile, searchDosenController, searchMahasiswaController } from "./dosen.controller";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";

const router = Router();

router.get(
  "/dosen/profile",
  authMiddleware,
  requirePermission(PERMISSIONS.DOSEN_PROFIL),
  getProfile,
);

router.patch(
  "/dosen/profile",
  authMiddleware,
  requirePermission(PERMISSIONS.DOSEN_PROFIL),
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
