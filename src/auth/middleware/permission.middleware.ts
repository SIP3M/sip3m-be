import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import { ROLES } from "../role";
import { PermissionKode } from "../permission";
import { prisma } from "../../prisma";

/**
 * Cek hak akses berbasis permission (dinamis, dari tabel role_permissions).
 *
 * - Semua user harus sudah login (pakai bersama authMiddleware).
 * - ADMIN_SISTEM = superuser: selalu lolos (kecuali permission sistem nonaktif).
 * - Role lain: izin diambil dari tabel `role_permissions` per role-nya.
 *
 * Contoh: router.post("/x", authMiddleware, requirePermission(PERMISSIONS.PENGGUNA_TAMBAH), handler)
 */
export const requirePermission =
  (kode: PermissionKode) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new HttpError("Unauthorized.", 401);
    }

    const role = (req.user.role ?? req.user.roles) as string | undefined;
    if (!role) {
      throw new HttpError("Unauthorized.", 401);
    }

    // Superuser ADMIN_SISTEM selalu lolos.
    if (role === ROLES.ADMIN_SISTEM) {
      next();
      return;
    }

    const link = await prisma.rolePermission.findFirst({
      where: {
        roles: { roles: role },
        permission: { kode },
      },
      select: { id: true },
    });

    if (!link) {
      throw new HttpError("You do not have permission to access this resource.", 403);
      return;
    }

    next();
  };

/**
 * Versi ringkas: izinkan jika user punya SALAH SATU dari daftar permission
 * (dipakai route yang multi-aksi / guard blok halaman FE-side tidak perlu).
 */
export const requireAnyPermission =
  (kodes: PermissionKode[]) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new HttpError("Unauthorized.", 401);
    }

    const role = (req.user.role ?? req.user.roles) as string | undefined;
    if (!role) {
      throw new HttpError("Unauthorized.", 401);
    }

    if (role === ROLES.ADMIN_SISTEM) {
      next();
      return;
    }

    const link = await prisma.rolePermission.findFirst({
      where: {
        roles: { roles: role },
        permission: { kode: { in: kodes } },
      },
      select: { id: true },
    });

    if (!link) {
      throw new HttpError("You do not have permission to access this resource.", 403);
      return;
    }

    next();
  };
