import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import {
  requireAnyPermission,
  requirePermission,
} from "../auth/middleware/permission.middleware";
import { PERMISSIONS } from "../auth/permission";
import { validate } from "../common/middleware/validate";
import {
  createRoleSchema,
  updateRolePermissionsSchema,
  updateRoleSchema,
} from "./roles.validation";
import {
  createRoleController,
  deleteRoleController,
  getRoleByIdController,
  getRolePermissionsController,
  listPermissionsController,
  listRolesController,
  updateRoleController,
  updateRolePermissionsController,
} from "./roles.controller";

const router = Router();

// Semua endpoint role & permission khusus ADMIN_SISTEM
// (ADMIN_SISTEM juga superuser pada requirePermission).
const adminSistem = [
  authMiddleware,
  requirePermission(PERMISSIONS.ROLE_KELOLA),
];

// Katalog izin (untuk matriks)
router.get("/permissions", ...adminSistem, listPermissionsController);

// Role CRUD — daftar role juga dipakai dropdown Manajemen Pengguna
// (ADMIN_LPPM punya pengguna.lihat), jadi GET list memakai any-of.
// Sisanya (create/update/delete/matriks) tetap khusus role.kelola.
router.get(
  "/roles",
  authMiddleware,
  requireAnyPermission([PERMISSIONS.ROLE_KELOLA, PERMISSIONS.PENGGUNA_LIHAT]),
  listRolesController,
);
router.post("/roles", ...adminSistem, validate(createRoleSchema), createRoleController);
router.get("/roles/:id", ...adminSistem, getRoleByIdController);
router.patch("/roles/:id", ...adminSistem, validate(updateRoleSchema), updateRoleController);
router.delete("/roles/:id", ...adminSistem, deleteRoleController);

// Matriks izin role
router.get("/roles/:id/permissions", ...adminSistem, getRolePermissionsController);
router.put(
  "/roles/:id/permissions",
  ...adminSistem,
  validate(updateRolePermissionsSchema),
  updateRolePermissionsController,
);

export default router;
