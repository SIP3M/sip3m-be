import { Router } from "express";
import {
  getUserById,
  getReviewers,
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

router.get("/users", authMiddleware, requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]), getUsers);

router.get(
  "/users/reviewers",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM, ROLES.ADMIN_SISTEM]),
  getReviewers,
);

router.get(
  "/users/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  getUserById,
);

router.post(
  "/users",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  validate(createUserSchema),
  createUser,
);

router.put(
  "/users/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  validate(updateUserSchema),
  updateUser,
);

router.patch(
  "/users/:id/role",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  validate(updateUserRoleSchema),
  updateUserRole,
);

router.patch(
  "/users/:id/status",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  validate(updateUserStatusSchema),
  updateUserStatus,
);

router.delete(
  "/users/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN_LPPM, ROLES.ADMIN_SISTEM]),
  deleteUser,
);

export default router;
