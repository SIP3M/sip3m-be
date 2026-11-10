import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import {
  CreateRoleInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "./roles.validation";

/** Role sistem yang tidak boleh diubah/dihapus. */
const SYSTEM_ROLE_NAMES = ["ADMIN_SISTEM"];

const assertNotSystemRole = (role: { roles: string; is_system: boolean }) => {
  if (role.is_system || SYSTEM_ROLE_NAMES.includes(role.roles)) {
    throw new HttpError("Role sistem tidak dapat diubah atau dihapus.", 400);
  }
};

// ─── Roles ─────────────────────────────────────────────────────────────

export const listRoles = async () => {
  const roles = await prisma.roles.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: {
        select: {
          users: true,
          permissions: true,
        },
      },
    },
  });

  return roles.map((role) => ({
    id: role.id,
    nama: role.roles,
    deskripsi: role.deskripsi,
    is_system: role.is_system,
    dashboard_path: role.dashboard_path,
    jumlah_pengguna: role._count.users,
    jumlah_izin: role._count.permissions,
  }));
};

export const getRoleById = async (roleId: number) => {
  const role = await prisma.roles.findUnique({
    where: { id: roleId },
    include: {
      _count: { select: { users: true, permissions: true } },
    },
  });

  if (!role) throw new HttpError("Role tidak ditemukan.", 404);

  return {
    id: role.id,
    nama: role.roles,
    deskripsi: role.deskripsi,
    is_system: role.is_system,
    dashboard_path: role.dashboard_path,
    jumlah_pengguna: role._count.users,
    jumlah_izin: role._count.permissions,
  };
};

export const createRole = async (input: CreateRoleInput) => {
  const existing = await prisma.roles.findUnique({
    where: { roles: input.nama },
  });
  if (existing) {
    throw new HttpError(`Role "${input.nama}" sudah ada.`, 409);
  }

  // Kumpulkan permission id: dari input.permissions + salin dari role lain.
  const kodeSet = new Set<string>(input.permissions ?? []);

  if (input.salin_dari_role_id) {
    const source = await prisma.roles.findUnique({
      where: { id: input.salin_dari_role_id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!source) throw new HttpError("Role sumber tidak ditemukan.", 404);
    source.permissions.forEach((link) => kodeSet.add(link.permission.kode));
  }

  const permissionRows =
    kodeSet.size > 0
      ? await prisma.permission.findMany({
          where: { kode: { in: [...kodeSet] } },
          select: { id: true },
        })
      : [];

  const role = await prisma.roles.create({
    data: {
      roles: input.nama,
      deskripsi: input.deskripsi ?? null,
      dashboard_path: "/reviewer-eksternal-dashboard",
      permissions: {
        create: permissionRows.map((p) => ({ permission_id: p.id })),
      },
    },
    include: { _count: { select: { users: true, permissions: true } } },
  });

  return {
    id: role.id,
    nama: role.roles,
    deskripsi: role.deskripsi,
    is_system: role.is_system,
    dashboard_path: role.dashboard_path,
    jumlah_pengguna: role._count.users,
    jumlah_izin: role._count.permissions,
  };
};

export const updateRole = async (roleId: number, input: UpdateRoleInput) => {
  const role = await prisma.roles.findUnique({ where: { id: roleId } });
  if (!role) throw new HttpError("Role tidak ditemukan.", 404);

  assertNotSystemRole(role);

  if (input.nama && input.nama !== role.roles) {
    const dup = await prisma.roles.findUnique({ where: { roles: input.nama } });
    if (dup) throw new HttpError(`Role "${input.nama}" sudah ada.`, 409);
  }

  const updated = await prisma.roles.update({
    where: { id: roleId },
    data: {
      ...(input.nama !== undefined ? { roles: input.nama } : {}),
      ...(input.deskripsi !== undefined ? { deskripsi: input.deskripsi } : {}),
      ...(input.dashboard_path !== undefined
        ? { dashboard_path: input.dashboard_path }
        : {}),
    },
    include: { _count: { select: { users: true, permissions: true } } },
  });

  return {
    id: updated.id,
    nama: updated.roles,
    deskripsi: updated.deskripsi,
    is_system: updated.is_system,
    dashboard_path: updated.dashboard_path,
    jumlah_pengguna: updated._count.users,
    jumlah_izin: updated._count.permissions,
  };
};

export const deleteRole = async (roleId: number) => {
  const role = await prisma.roles.findUnique({
    where: { id: roleId },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw new HttpError("Role tidak ditemukan.", 404);

  assertNotSystemRole(role);

  if (role._count.users > 0) {
    throw new HttpError(
      `Role masih digunakan oleh ${role._count.users} pengguna. Pindahkan pengguna dulu sebelum menghapus.`,
      400,
    );
  }

  await prisma.roles.delete({ where: { id: roleId } }); // cascade ke role_permissions
  return { id: role.id, nama: role.roles };
};

// ─── Permission catalog ────────────────────────────────────────────────

export const listPermissions = async () => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ grup: "asc" }, { kode: "asc" }],
  });
  return permissions;
};

// ─── Role ↔ Permission matrix ──────────────────────────────────────────

export const getRolePermissions = async (roleId: number) => {
  const role = await prisma.roles.findUnique({
    where: { id: roleId },
    include: {
      permissions: { select: { permission_id: true } },
      _count: { select: { users: true, permissions: true } },
    },
  });
  if (!role) throw new HttpError("Role tidak ditemukan.", 404);

  const all = await prisma.permission.findMany({ orderBy: [{ grup: "asc" }, { kode: "asc" }] });
  const granted = new Set(role.permissions.map((l) => l.permission_id));

  return {
    role: {
      id: role.id,
      nama: role.roles,
      deskripsi: role.deskripsi,
      is_system: role.is_system,
      dashboard_path: role.dashboard_path,
      jumlah_pengguna: role._count.users,
      jumlah_izin: role._count.permissions,
    },
    permissions: all.map((p) => ({
      id: p.id,
      kode: p.kode,
      nama: p.nama,
      grup: p.grup,
      aktif: granted.has(p.id),
    })),
  };
};

export const updateRolePermissions = async (
  roleId: number,
  input: UpdateRolePermissionsInput,
) => {
  const role = await prisma.roles.findUnique({ where: { id: roleId } });
  if (!role) throw new HttpError("Role tidak ditemukan.", 404);

  assertNotSystemRole(role);

  const target = await prisma.permission.findMany({
    where: { kode: { in: input.permissions } },
    select: { id: true },
  });

  // Replace seluruh set (delete semua lalu create baru) dalam satu transaction.
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role_id: roleId } }),
    prisma.rolePermission.createMany({
      data: target.map((p) => ({ role_id: roleId, permission_id: p.id })),
      skipDuplicates: true,
    }),
  ]);

  return { id: role.id, nama: role.roles, jumlah_izin: target.length };
};
