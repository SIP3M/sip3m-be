import { Router } from 'express';
import { getProfile, updateProfile } from './dosen.controller';
import { authMiddleware } from '../auth/middleware/auth.middleware';
import { requireRole } from '../auth/middleware/role.middleware';
import { ROLES } from '../auth/role';

const router = Router();

router.get(
  '/dosen/profile',
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  getProfile,
);

router.patch(
  '/dosen/profile',
  authMiddleware,
  requireRole([ROLES.DOSEN]),
  updateProfile,
);

export default router;
