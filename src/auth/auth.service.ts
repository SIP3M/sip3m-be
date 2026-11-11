import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import {
  RegisterDosenInput,
  RegisterDosenResult,
  LoginInput,
  LoginResult,
  RegisterReviewerInput,
  RegisterReviewerResult,
} from "./types/auth.types";

export const registerDosen = async (
  data: RegisterDosenInput,
): Promise<RegisterDosenResult> => {
  const existingUser = await prisma.users.findFirst({
    where: {
      OR: [
        { username: data.username },
        { email: data.email },
        { nidn_nip: data.nidn },
      ],
    },
  });

  if (existingUser) {
    if (existingUser.username === data.username)
      throw new HttpError("Username sudah digunakan.", 400);
    if (existingUser.email === data.email)
      throw new HttpError("Email sudah digunakan.", 400);
    if (existingUser.nidn_nip === data.nidn)
      throw new HttpError("NIDN sudah digunakan.", 400);
  }

  const fakultas = await prisma.fakultas.findUnique({
    where: { id: data.fakultas_id },
  });

  if (!fakultas) {
    throw new HttpError("Fakultas tidak ditemukan.", 400);
  }

  const programStudi = await prisma.programStudi.findFirst({
    where: { id: data.program_studi_id, fakultas_id: data.fakultas_id },
  });

  if (!programStudi) {
    throw new HttpError(
      "Program Studi tidak ditemukan di fakultas tersebut.",
      400,
    );
  }

  const dosenRole = await prisma.roles.findFirst({
    where: { roles: "DOSEN" },
  });

  if (!dosenRole) {
    throw new HttpError("Role DOSEN tidak ditemukan di database.", 500);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const newUser = await prisma.users.create({
    data: {
      name: data.name,
      email: data.email,
      username: data.username,
      password_hash: passwordHash,
      nidn_nip: data.nidn,
      fakultas_id: data.fakultas_id,
      program_studi_id: data.program_studi_id,
      tempat_lahir: data.tempat_lahir,
      tanggal_lahir: new Date(data.tanggal_lahir),
      jenis_kelamin: data.jenis_kelamin,
      alamat: data.alamat,
      is_active: false,
      nomor_hp: data.nomor_hp,
      role_id: dosenRole.id,
    },
    include: { roles: true },
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    username: newUser.username,
    nidn: newUser.nidn_nip,
    roles: {
      id: newUser.roles.id,
      roles: newUser.roles.roles,
    },
    is_active: newUser.is_active,
  };
};

export const registerReviewer = async (
  data: RegisterReviewerInput,
  cvFilePath: string,
): Promise<RegisterReviewerResult> => {
  const existingUser = await prisma.users.findFirst({
    where: {
      OR: [{ username: data.username }, { email: data.email }],
    },
  });

  if (existingUser) {
    if (existingUser.username === data.username)
      throw new HttpError("Username sudah digunakan.", 400);
    if (existingUser.email === data.email)
      throw new HttpError("Email sudah digunakan.", 400);
  }

  const reviewerRole = await prisma.roles.findFirst({
    where: { roles: "REVIEWER_EKSTERNAL" },
  });

  if (!reviewerRole) {
    throw new HttpError(
      "Role REVIEWER_EKSTERNAL tidak ditemukan di database.",
      500,
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const newUser = await prisma.users.create({
    data: {
      name: data.name,
      email: data.email,
      username: data.username,
      password_hash: passwordHash,
      nomor_hp: data.nomor_hp,
      instansi: data.instansi,
      bidang_keahlian: data.bidang_keahlian,
      pengalaman_review: data.pengalaman_review,
      cv_path: cvFilePath,
      is_active: false,
      role_id: reviewerRole.id,
    },
    include: { roles: true },
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    username: newUser.username,
    roles: {
      id: newUser.roles.id,
      roles: newUser.roles.roles,
    },
    is_active: newUser.is_active,
  };
};

/**
 * Bentuk user minimal untuk menerbitkan sesi login (dipakai login biasa
 * maupun login OAuth Google — keduanya harus menghasilkan response identik:
 * JWT + session + permissions + metadata roles).
 */
export type SessionUser = {
  id: number;
  name: string;
  email: string;
  nidn_nip: string | null;
  fakultas_id: number | null;
  roles: {
    id: number;
    roles: string;
    deskripsi: string | null;
    is_system: boolean;
    dashboard_path: string | null;
  };
};

/**
 * Terbitkan JWT + rotasi session + muat permissions untuk user yang sudah
 * lolos verifikasi kredensial (password maupun Google).
 */
export const issueSessionForUser = async (
  user: SessionUser,
  meta?: { deviceId?: string; userAgent?: string; ip?: string },
  rememberMe = true,
): Promise<LoginResult> => {
  const expiresIn = rememberMe ? "7d" : "1d";
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new HttpError("JWT_SECRET tidak ditemukan.", 500);
  }

  const { createOrRotateSession, generateJti } = await import("./session.service");
  const jti = generateJti();
  const deviceId = meta?.deviceId?.trim()
    ? meta.deviceId.trim().slice(0, 100)
    : `ua-${(meta?.userAgent ?? "unknown").slice(0, 80)}`;
  const expiresAt = new Date(
    Date.now() + (rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000),
  );

  // Izin user (kode permission) — ADMIN_SISTEM = superuser (semua izin).
  let permissions: string[];
  if (user.roles.roles === "ADMIN_SISTEM") {
    const all = await prisma.permission.findMany({
      select: { kode: true },
      orderBy: { kode: "asc" },
    });
    permissions = all.map((p) => p.kode);
  } else {
    const links = await prisma.rolePermission.findMany({
      where: { role_id: user.roles.id },
      include: { permission: { select: { kode: true } } },
    });
    permissions = links.map((l) => l.permission.kode).sort();
  }

  const token = jwt.sign(
    {
      sub: String(user.id),
      userId: user.id,
      role: user.roles.roles,
      roles: user.roles.roles,
      jti,
      deviceId,
    },
    jwtSecret,
    { expiresIn },
  );

  await createOrRotateSession({
    userId: user.id,
    deviceId,
    jti,
    userAgent: meta?.userAgent,
    ip: meta?.ip,
    expiresAt,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: {
        id: user.roles.id,
        roles: user.roles.roles,
        deskripsi: user.roles.deskripsi,
        is_system: user.roles.is_system,
        dashboard_path: user.roles.dashboard_path,
      },
      permissions,
      nidn: user.nidn_nip,
      fakultas_id: user.fakultas_id,
    },
  };
};

export const loginUser = async (
  data: LoginInput,
  meta?: { deviceId?: string; userAgent?: string; ip?: string },
): Promise<LoginResult> => {
  const identifier = data.identifier.trim();
  const isEmailIdentifier = identifier.includes("@");

  const user = await prisma.users.findUnique({
    where: isEmailIdentifier ? { email: identifier } : { nidn_nip: identifier },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      fakultas_id: true,
      password_hash: true,
      is_active: true,
      roles: {
        select: {
          id: true,
          roles: true,
          deskripsi: true,
          is_system: true,
          dashboard_path: true,
        },
      },
    },
  });

  if (!user) {
    throw new HttpError(
      "User tidak ditemukan. Silahkan daftar terlebih dahulu.",
      404,
    );
  }

  if (!user.password_hash) {
    throw new HttpError("Password tidak ditemukan.", 500);
  }

  if (!user.is_active) {
    throw new HttpError("Akun Anda belum diverifikasi oleh Ketua LPPM.", 403);
  }

  const passwordMatch = await bcrypt.compare(data.password, user.password_hash);

  if (!passwordMatch) {
    throw new HttpError("Invalid Credentials.", 401);
  }

  return issueSessionForUser(user, meta, data.remember_me ?? false);
};
  