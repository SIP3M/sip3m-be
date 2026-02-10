import { Router } from 'express';
import { getUserById, getUsers, updateUserRole, updateUserStatus } from './users.controller';
import { authMiddleware } from '../auth/middleware/auth.middleware';
import { requireRole } from '../auth/middleware/role.middleware';
import { ROLES } from '../auth/role';
import { updateUserRoleSchema, updateUserStatusSchema } from './users.validation';
import { validate } from '../common/middleware/validate';

const router = Router();

router.get(
  '/users',
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getUsers,
);

router.get(
  '/users/:id',
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
  getUserById,
);

router.patch(
  '/users/:id/role',
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  validate(updateUserRoleSchema),
  updateUserRole,
);

router.patch(
  '/users/:id/status',
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  validate(updateUserStatusSchema),
  updateUserStatus,
);

export default router;
