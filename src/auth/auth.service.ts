import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { HttpError } from '../common/errors/http-error';
import { getJwtSignOptions } from './jwt.config';
import {
  RegisterInput,
  RegisterResult,
  LoginInput,
  LoginResult,
} from './types/auth.types';


export const registerUser = async (
  data: RegisterInput,
): Promise<RegisterResult> => {
  const existingUser = await prisma.users.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new HttpError(
      'An account with this email address already exists.',
      409,
    );
  }

  const defaultRole = await prisma.roles.findUnique({
    where: { roles: 'REVIEWER' },
  });

  if (!defaultRole) {
    throw new HttpError(
      'Default role REVIEWER is not configured in the system.',
      500,
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.users.create({
    data: {
      name: data.name,
      email: data.email,
      password_hash: passwordHash,
      role_id: defaultRole.id,
      nidn_nip: data.nidn ?? null,
      fakultas: data.fakultas ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      fakultas: true,
      created_at: true,
      roles: true,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    nidn: user.nidn_nip,
    fakultas: user.fakultas,
    created_at: user.created_at!,
    roles: {
      id: user.roles.id,
      roles: user.roles.roles,
    },
  };
};

export const loginUser = async (
  data: LoginInput,
): Promise<LoginResult> => {
  const user = await prisma.users.findUnique({
    where: { email: data.email },
    include: { roles: true },
  });

  if (!user || !user.password_hash) {
    throw new HttpError('Invalid email or password.', 401);
  }

  const valid = await bcrypt.compare(data.password, user.password_hash);

  if (!valid) {
    throw new HttpError('Invalid email or password.', 401);
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new HttpError('JWT secret is not configured.', 500);
  }

  const token = jwt.sign(
    { sub: String(user.id), role: user.roles.roles },
    secret,
    getJwtSignOptions(),
  );

  return {
    access_token: token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      nidn: user.nidn_nip,
      fakultas: user.fakultas,
      roles: {
        id: user.roles.id,
        roles: user.roles.roles,
      },
    },
  };
};
