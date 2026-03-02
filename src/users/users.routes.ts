import { Router } from "express";
import {
  getUserById,
  getUsers,
  updateUserRole,
  updateUserStatus,
  createUser,
  updateUser,
  deleteUser,
} from "./users.controller";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/role.middleware";
import { ROLES } from "../auth/role";
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
  createUserSchema,
  updateUserSchema,
} from "./users.validation";
import { validate } from "../common/middleware/validate";

const router = Router();

router.get("/users", authMiddleware, requireRole([ROLES.ADMIN_LPPM]), getUsers);

router.get(
  "/users/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  getUserById,
);

router.post(
  "/users",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  validate(createUserSchema),
  createUser,
);

router.put(
  "/users/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  validate(updateUserSchema),
  updateUser,
);

router.patch(
  "/users/:id/role",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  validate(updateUserRoleSchema),
  updateUserRole,
);

router.patch(
  "/users/:id/status",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  validate(updateUserStatusSchema),
  updateUserStatus,
);

router.delete(
  "/users/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM]),
  deleteUser,
);

export default router;
