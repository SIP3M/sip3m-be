import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { HttpError } from '../common/errors/http-error';
import { getJwtSignOptions } from './jwt.config';
import {
  RegisterDosenInput,
  RegisterDosenResult,
  LoginInput,
  LoginResult,
  RegisterReviewerInput,
  RegisterReviewerResult,
} from './types/auth.types';

export const registerDosen = async (
  data: RegisterDosenInput,
) : Promise<RegisterDosenResult> => {
  const existingUser = await prisma.users.findFirst({
    where: {
      OR: [
        {username: data.username},
        {email: data.email},
        {nidn_nip: data.nidn},
      ]
    },
  });

  if (existingUser){
    if (existingUser.username === data.username) throw new HttpError('Username sudah digunakan.', 400);
    if (existingUser.email === data.email) throw new HttpError('Email sudah digunakan.', 400);
    if (existingUser.nidn_nip === data.nidn) throw new HttpError('NIDN sudah digunakan.', 400);
  }

  const dosenRole = await prisma.roles.findFirst({
    where: { roles: 'DOSEN' },
  });

  if (!dosenRole) {
    throw new HttpError('Role DOSEN tidak ditemukan di database.', 500);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const newUser = await prisma.users.create({
    data: {
      name: data.name,
      email: data.email,
      username: data.username,
      password_hash: passwordHash,
      nidn_nip: data.nidn,
      fakultas: data.fakultas,
      program_studi: data.program_studi,
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
    }
}

export const registerReviewer = async (
data: RegisterReviewerInput, cvFilePath: string,
) : Promise<RegisterReviewerResult> => {
  const existingUser = await prisma.users.findFirst({
    where: {
      OR: [
        {username: data.username},
        {email: data.email},
      ]
    },
  });

  if (existingUser) {
    if (existingUser.username === data.username) throw new HttpError('Username sudah digunakan.', 400);
    if (existingUser.email === data.email) throw new HttpError('Email sudah digunakan.', 400);
  }

  const reviewerRole = await prisma.roles.findFirst({
    where: { roles: 'REVIEWER_EKSTERNAL' },
  });

  if (!reviewerRole) {
    throw new HttpError('Role REVIEWER_EKSTERNAL tidak ditemukan di database.', 500);
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
   }
}
  
export const loginUser = async (
  data: LoginInput,
) : Promise<LoginResult> => {
  const user = await prisma.users.findFirst({
    where: {
      OR: [
        { email: data.identifier },
        { nidn_nip: data.identifier },
      ]
    },
    include: { roles: true },
  });

  if (!user) {
    throw new HttpError('User tidak ditemukan. Silahkan daftar terlebih dahulu.', 404);
  }

  if (!user.password_hash) {
    throw new HttpError('Password tidak ditemukan.', 500);
  }

  const passwordMatch = await bcrypt.compare(data.password, user.password_hash);

  if (!passwordMatch) {
    throw new HttpError('Password salah. Silahkan coba lagi.', 401);
  }

  if (!user.is_active) {
    throw new HttpError('Akun Anda belum diverifikasi oleh Admin LPPM.', 403);
  }

  const expiresIn = data.remember_me ? '7d' : '1d'; 
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new HttpError('JWT_SECRET tidak ditemukan.', 500);
  }

  const token = jwt.sign(
    { 
      userId: user.id, 
      role: user.roles.roles 
    },
    jwtSecret,
    { expiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: {
        id: user.roles.id,
        roles: user.roles.roles,
      },
      nidn: user.nidn_nip,
      fakultas: user.fakultas
    }
  };
};