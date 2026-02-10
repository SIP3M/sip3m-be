import { Response } from 'express';
import { registerUser, loginUser } from './auth.service';
import { HttpError } from '../common/errors/http-error';
import {
  RegisterRequestBody,
  LoginRequestBody,
} from './types/auth.types';
import { AuthenticatedRequest } from './types/auth.jwt.types';
import { prisma } from '../prisma';

/**
 * REGISTER
 */
export const register = async (
  req: { body: RegisterRequestBody },
  res: Response,
): Promise<Response> => {
  try {
    const { name, email, password, nidn, fakultas } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required.',
      });
    }

    console.log('[REGISTER BODY RAW]', req.body);
console.log('[REGISTER NIDN]', req.body.nidn);


    const user = await registerUser({
      name,
      email,
      password,
      nidn,
      fakultas,
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      data: user,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error('[REGISTER_ERROR]', error);
    return res.status(500).json({
      message: 'An unexpected error occurred during registration.',
    });
  }
};

/**
 * LOGIN
 */
export const login = async (
  req: { body: LoginRequestBody },
  res: Response,
): Promise<Response> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const result = await loginUser({ email, password });

    return res.status(200).json({
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error('[LOGIN_ERROR]', error);
    return res.status(500).json({
      message: 'An unexpected error occurred during login.',
    });
  }
};

/**
 * GET CURRENT USER (/me)
 */
export const me = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized.',
    });
  }

  // JWT sub = string → convert ke number (WAJIB)
  const userId = Number(req.user.sub);

  if (Number.isNaN(userId)) {
    return res.status(401).json({
      message: 'Invalid authentication token.',
    });
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      roles: {
        select: {
          id: true,
          roles: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      message: 'User not found.',
    });
  }

  return res.status(200).json({
    data: {
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
  });
};
