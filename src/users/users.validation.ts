import { z } from "zod";
import { ROLES } from "../auth/role";

export const updateUserRoleSchema = z.object({
  roles: z.enum([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.DOSEN,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
});

export const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
});

export const createUserSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email().max(100),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).max(100),
  roles: z.enum([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.DOSEN,
    ROLES.REVIEWER,
    ROLES.REVIEWER_EKSTERNAL,
  ]),
  nidn_nip: z.string().max(30).optional(),
  fakultas: z.string().max(100).optional(),
  program_studi: z.string().max(100).optional(),
  tempat_lahir: z.string().max(100).optional(),
  tanggal_lahir: z.string().optional(),
  jenis_kelamin: z.string().max(15).optional(),
  alamat: z.string().optional(),
  nomor_hp: z.string().max(20).optional(),
  is_active: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  email: z.string().email().max(100).optional(),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).max(100).optional(),
  roles: z
    .enum([
      ROLES.ADMIN_LPPM,
      ROLES.STAFF_LPPM,
      ROLES.DOSEN,
      ROLES.REVIEWER,
      ROLES.REVIEWER_EKSTERNAL,
    ])
    .optional(),
  nidn_nip: z.string().max(30).optional(),
  fakultas: z.string().max(100).optional(),
  program_studi: z.string().max(100).optional(),
  tempat_lahir: z.string().max(100).optional(),
  tanggal_lahir: z.string().optional(),
  jenis_kelamin: z.string().max(15).optional(),
  alamat: z.string().optional(),
  nomor_hp: z.string().max(20).optional(),
  is_active: z.boolean().optional(),
});
