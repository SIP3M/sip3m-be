import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import { Prisma } from "../generated/prisma/client";

const getUniqueConstraintInfo = (
  error: Prisma.PrismaClientKnownRequestError,
): { message: string; field: "email" | "username" | "nidn_nip" | null } => {
  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target.map(String)
    : target
      ? [String(target)]
      : [];

  if (fields.some((field) => field.includes("email"))) {
    return { message: "Email sudah digunakan.", field: "email" };
  }

  if (fields.some((field) => field.includes("username"))) {
    return { message: "Username sudah digunakan.", field: "username" };
  }

  if (fields.some((field) => field.includes("nidn_nip"))) {
    return { message: "NIDN/NIP sudah digunakan.", field: "nidn_nip" };
  }

  return { message: "Data unik sudah digunakan.", field: null };
};

export const getReviewers = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const reviewers = await prisma.users.findMany({
      where: {
        roles: {
          roles: { in: ["REVIEWER", "REVIEWER_EKSTERNAL"] },
        },
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({ data: reviewers });
  } catch (error) {
    console.error("[GET_REVIEWERS_ERROR]", error);
    throw new HttpError(
      "Terjadi kesalahan saat mengambil daftar reviewer.",
      500,
    );
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { status, roles, search, page } = req.query;
    const perPage = 5;

    const parsedPage = Number(page ?? 1);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new HttpError("Parameter page harus berupa angka bulat >= 1.", 400);
    }

    const skip = (parsedPage - 1) * perPage;

    const whereClause: Prisma.usersWhereInput = {};

    if (status === "pending") {
      whereClause.is_active = false;
    } else if (status === "active") {
      whereClause.is_active = true;
    }

    if (roles) {
      whereClause.roles = {
        roles: String(roles).toUpperCase(),
      };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { email: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [users, totalItems] = await Promise.all([
      prisma.users.findMany({
        where: whereClause,
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
          created_at: "desc",
        },
        skip,
        take: perPage,
      }),
      prisma.users.count({ where: whereClause }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

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
          roles: user.roles.roles,
        },
      })),
      pagination: {
        page: parsedPage,
        per_page: perPage,
        total_items: totalItems,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error("[GET_USERS_ERROR]", error);
    throw new HttpError(
      "An unexpected error occurred while fetching users.",
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
    throw new HttpError("Invalid user id.", 400);
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      nidn_nip: true,
      fakultas: true,
      program_studi: true,
      tempat_lahir: true,
      tanggal_lahir: true,
      jenis_kelamin: true,
      alamat: true,
      nomor_hp: true,
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
    throw new HttpError("User not found.", 404);
  }

  return res.status(200).json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      nidn: user.nidn_nip,
      fakultas: user.fakultas,
      program_studi: user.program_studi,
      tempat_lahir: user.tempat_lahir,
      tanggal_lahir: user.tanggal_lahir,
      jenis_kelamin: user.jenis_kelamin,
      alamat: user.alamat,
      nomor_hp: user.nomor_hp,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      roles: {
        id: user.roles.id,
        roles: user.roles.roles,
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
    throw new HttpError("Invalid user id.", 400);
  }

  const { roles } = req.body as { roles: string };

  // pastikan user ada
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError("User not found.", 404);
  }

  // cari role_id berdasarkan nama role
  const roleRecord = await prisma.roles.findUnique({
    where: { roles: roles.toUpperCase() },
  });

  if (!roleRecord) {
    throw new HttpError("Role not found.", 400);
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
    message: "User role updated successfully.",
    data: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      nidn: updatedUser.nidn_nip,
      fakultas: updatedUser.fakultas,
      roles: {
        id: updatedUser.roles.id,
        roles: updatedUser.roles.roles,
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
    throw new HttpError("Invalid user id.", 400);
  }

  const { is_active } = req.body as { is_active: boolean };

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError("User not found.", 404);
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
    message: "User status updated successfully.",
    data: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      nidn: updatedUser.nidn_nip,
      fakultas: updatedUser.fakultas,
      is_active: updatedUser.is_active,
      roles: {
        id: updatedUser.roles.id,
        roles: updatedUser.roles.roles,
      },
    },
  });
};

export const createUser = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const body = req.body as {
      name: string;
      email: string;
      username?: string;
      password: string;
      roles: string;
      nidn_nip?: string;
      fakultas?: string;
      program_studi?: string;
      tempat_lahir?: string;
      tanggal_lahir?: string;
      jenis_kelamin?: string;
      alamat?: string;
      nomor_hp?: string;
      is_active?: boolean;
    };

    const roleRecord = await prisma.roles.findUnique({
      where: { roles: body.roles.toUpperCase() },
    });

    if (!roleRecord) {
      throw new HttpError("Role tidak ditemukan.", 400);
    }

    const existing = await prisma.users.findFirst({
      where: {
        OR: [
          { email: body.email },
          ...(body.username ? [{ username: body.username }] : []),
          ...(body.nidn_nip ? [{ nidn_nip: body.nidn_nip }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.email === body.email)
        return res.status(409).json({
          message: "Email sudah digunakan.",
          error: {
            code: "UNIQUE_CONSTRAINT",
            field: "email",
          },
        });
      if (body.username && existing.username === body.username)
        return res.status(409).json({
          message: "Username sudah digunakan.",
          error: {
            code: "UNIQUE_CONSTRAINT",
            field: "username",
          },
        });
      if (body.nidn_nip && existing.nidn_nip === body.nidn_nip)
        return res.status(409).json({
          message: "NIDN/NIP sudah digunakan.",
          error: {
            code: "UNIQUE_CONSTRAINT",
            field: "nidn_nip",
          },
        });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const newUser = await prisma.users.create({
      data: {
        name: body.name,
        email: body.email,
        username: body.username ?? null,
        password_hash: passwordHash,
        role_id: roleRecord.id,
        nidn_nip: body.nidn_nip ?? null,
        fakultas: body.fakultas ?? null,
        program_studi: body.program_studi ?? null,
        tempat_lahir: body.tempat_lahir ?? null,
        tanggal_lahir: body.tanggal_lahir ? new Date(body.tanggal_lahir) : null,
        jenis_kelamin: body.jenis_kelamin ?? null,
        alamat: body.alamat ?? null,
        nomor_hp: body.nomor_hp ?? null,
        is_active: body.is_active ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        nidn_nip: true,
        fakultas: true,
        is_active: true,
        created_at: true,
        roles: { select: { id: true, roles: true } },
      },
    });

    return res.status(201).json({
      message: "User berhasil dibuat.",
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        nidn: newUser.nidn_nip,
        fakultas: newUser.fakultas,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
        roles: { id: newUser.roles.id, roles: newUser.roles.roles },
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const uniqueError = getUniqueConstraintInfo(error);
      return res.status(409).json({
        message: uniqueError.message,
        error: {
          code: "UNIQUE_CONSTRAINT",
          field: uniqueError.field,
        },
      });
    }

    throw error;
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const userId = Number(req.params.id);

    if (Number.isNaN(userId)) {
      throw new HttpError("Invalid user id.", 400);
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError("User tidak ditemukan.", 404);
    }

    const body = req.body as {
      name?: string;
      email?: string;
      username?: string;
      password?: string;
      roles?: string;
      nidn_nip?: string;
      fakultas?: string;
      program_studi?: string;
      tempat_lahir?: string;
      tanggal_lahir?: string;
      jenis_kelamin?: string;
      alamat?: string;
      nomor_hp?: string;
      is_active?: boolean;
    };

    let roleId = user.role_id;
    if (body.roles) {
      const roleRecord = await prisma.roles.findUnique({
        where: { roles: body.roles.toUpperCase() },
      });
      if (!roleRecord) throw new HttpError("Role tidak ditemukan.", 400);
      roleId = roleRecord.id;
    }

    if (body.email || body.username || body.nidn_nip) {
      const duplicate = await prisma.users.findFirst({
        where: {
          id: { not: userId },
          OR: [
            ...(body.email ? [{ email: body.email }] : []),
            ...(body.username ? [{ username: body.username }] : []),
            ...(body.nidn_nip ? [{ nidn_nip: body.nidn_nip }] : []),
          ],
        },
      });

      if (duplicate) {
        if (body.email && duplicate.email === body.email)
          return res.status(409).json({
            message: "Email sudah digunakan.",
            error: {
              code: "UNIQUE_CONSTRAINT",
              field: "email",
            },
          });
        if (body.username && duplicate.username === body.username)
          return res.status(409).json({
            message: "Username sudah digunakan.",
            error: {
              code: "UNIQUE_CONSTRAINT",
              field: "username",
            },
          });
        if (body.nidn_nip && duplicate.nidn_nip === body.nidn_nip)
          return res.status(409).json({
            message: "NIDN/NIP sudah digunakan.",
            error: {
              code: "UNIQUE_CONSTRAINT",
              field: "nidn_nip",
            },
          });
      }
    }

    const updatedData: Prisma.usersUpdateInput = {
      roles: { connect: { id: roleId } },
      updated_at: new Date(),
    };
    if (body.name !== undefined) updatedData.name = body.name;
    if (body.email !== undefined) updatedData.email = body.email;
    if (body.username !== undefined) updatedData.username = body.username;
    if (body.password)
      updatedData.password_hash = await bcrypt.hash(body.password, 10);
    if (body.nidn_nip !== undefined) updatedData.nidn_nip = body.nidn_nip;
    if (body.fakultas !== undefined) updatedData.fakultas = body.fakultas;
    if (body.program_studi !== undefined)
      updatedData.program_studi = body.program_studi;
    if (body.tempat_lahir !== undefined)
      updatedData.tempat_lahir = body.tempat_lahir;
    if (body.tanggal_lahir !== undefined)
      updatedData.tanggal_lahir = new Date(body.tanggal_lahir);
    if (body.jenis_kelamin !== undefined)
      updatedData.jenis_kelamin = body.jenis_kelamin;
    if (body.alamat !== undefined) updatedData.alamat = body.alamat;
    if (body.nomor_hp !== undefined) updatedData.nomor_hp = body.nomor_hp;
    if (body.is_active !== undefined) updatedData.is_active = body.is_active;

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updatedData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        nidn_nip: true,
        fakultas: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        roles: { select: { id: true, roles: true } },
      },
    });

    return res.status(200).json({
      message: "User berhasil diperbarui.",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        nidn: updatedUser.nidn_nip,
        fakultas: updatedUser.fakultas,
        is_active: updatedUser.is_active,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        roles: { id: updatedUser.roles.id, roles: updatedUser.roles.roles },
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const uniqueError = getUniqueConstraintInfo(error);
      return res.status(409).json({
        message: uniqueError.message,
        error: {
          code: "UNIQUE_CONSTRAINT",
          field: uniqueError.field,
        },
      });
    }

    throw error;
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const userId = Number(req.params.id);

  if (Number.isNaN(userId)) {
    throw new HttpError("Invalid user id.", 400);
  }

  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError("User tidak ditemukan.", 404);
  }

  await prisma.users.delete({ where: { id: userId } });

  return res.status(200).json({
    message: "User berhasil dihapus.",
  });
};
