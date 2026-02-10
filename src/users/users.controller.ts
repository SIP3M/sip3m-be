import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { HttpError } from '../common/errors/http-error';

export const getUsers = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        nidn_nip: true,
        fakultas: true,
        is_active: true,
        created_at: true,
        roles: {
          select: {
            id: true,
            roles: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return res.status(200).json({
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        nidn: user.nidn_nip,
        fakultas: user.fakultas,
        is_active: user.is_active,
        created_at: user.created_at,
        roles: {
          id: user.roles.id,
          role: user.roles.roles,
        },
      })),
    });
  } catch (error) {
    console.error('[GET_USERS_ERROR]', error);
    throw new HttpError(
      'An unexpected error occurred while fetching users.',
      500,
    );
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const userId = Number(req.params.id);

  if (Number.isNaN(userId)) {
    throw new HttpError('Invalid user id.', 400);
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      fakultas: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      roles: {
        select: {
          id: true,
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
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      roles: {
        id: user.roles.id,
        role: user.roles.roles,
      },
    },
  });
};

export const updateUserRole = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const userId = Number(req.params.id);

  if (Number.isNaN(userId)) {
    throw new HttpError('Invalid user id.', 400);
  }

  const { role } = req.body as { role: string };

  // pastikan user ada
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError('User not found.', 404);
  }

  // cari role_id berdasarkan nama role
  const roleRecord = await prisma.roles.findUnique({
    where: { roles: role },
  });

  if (!roleRecord) {
    throw new HttpError('Role not found.', 400);
  }

  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: {
      role_id: roleRecord.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      fakultas: true,
      roles: {
        select: {
          id: true,
          roles: true,
        },
      },
    },
  });

  return res.status(200).json({
    message: 'User role updated successfully.',
    data: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      nidn: updatedUser.nidn_nip,
      fakultas: updatedUser.fakultas,
      roles: {
        id: updatedUser.roles.id,
        role: updatedUser.roles.roles,
      },
    },
  });
};

export const updateUserStatus = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const userId = Number(req.params.id);

  if (Number.isNaN(userId)) {
    throw new HttpError('Invalid user id.', 400);
  }

  const { is_active } = req.body as { is_active: boolean };

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError('User not found.', 404);
  }

  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: { is_active },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      fakultas: true,
      is_active: true,
      roles: {
        select: {
          id: true,
          roles: true,
        },
      },
    },
  });

  return res.status(200).json({
    message: 'User status updated successfully.',
    data: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      nidn: updatedUser.nidn_nip,
      fakultas: updatedUser.fakultas,
      is_active: updatedUser.is_active,
      roles: {
        id: updatedUser.roles.id,
        role: updatedUser.roles.roles,
      },
    },
  });
};

