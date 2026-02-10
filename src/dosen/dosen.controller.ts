import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../auth/types/auth.jwt.types';
import { HttpError } from '../common/errors/http-error';

/**
 * GET /dosen/profile
 */
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  if (!req.user) {
    throw new HttpError('Unauthorized.', 401);
  }

  const userId = Number(req.user.sub);

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      fakultas: true,
      created_at: true,
      roles: {
        select: {
          roles: true,
        },
      },
    },
  });

  if (!user) {
    throw new HttpError('User not found.', 404);
  }

  return res.status(200).json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      nidn: user.nidn_nip,
      fakultas: user.fakultas,
      roles: user.roles.roles,
      created_at: user.created_at,
    },
  });
};

/**
 * PATCH /dosen/profile
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  if (!req.user) {
    throw new HttpError('Unauthorized.', 401);
  }

  const userId = Number(req.user.sub);
  const { name, nidn, fakultas } = req.body as {
    name?: string;
    nidn?: string;
    fakultas?: string;
  };

  const updated = await prisma.users.update({
    where: { id: userId },
    data: {
      name,
      nidn_nip: nidn,
      fakultas,
    },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      fakultas: true,
      roles: {
        select: { roles: true },
      },
    },
  });

  return res.status(200).json({
    message: 'Profile updated successfully.',
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      nidn: updated.nidn_nip,
      fakultas: updated.fakultas,
      roles: updated.roles.roles,
    },
  });
};
