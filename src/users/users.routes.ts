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
import { requirePermission } from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
  createUserSchema,
  updateUserSchema,
} from "./users.validation";
import { validate } from "../common/middleware/validate";

const router = Router();

router.get("/users", authMiddleware, requirePermission(PERMISSIONS.PENGGUNA_LIHAT), getUsers);

router.get(
  "/users/reviewers",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGGUNA_LIHAT_REVIEWER),
  getReviewers,
);

router.get(
  "/users/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGGUNA_LIHAT),
  getUserById,
);

router.post(
  "/users",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGGUNA_TAMBAH),
  validate(createUserSchema),
  createUser,
);

router.put(
  "/users/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGGUNA_EDIT),
  validate(updateUserSchema),
  updateUser,
);

router.patch(
  "/users/:id/role",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGGUNA_UBAH_ROLE),
  validate(updateUserRoleSchema),
  updateUserRole,
);

router.patch(
  "/users/:id/status",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGGUNA_UBAH_STATUS),
  validate(updateUserStatusSchema),
  updateUserStatus,
);

router.delete(
  "/users/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.PENGGUNA_HAPUS),
  deleteUser,
);

export default router;
