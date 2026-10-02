import { Response } from "express";
import { prisma } from "../prisma";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import { searchDosen, searchMahasiswa } from "./dosen.service";

/**
 * GET /dosen/profile
 */
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  if (!req.user) {
    throw new HttpError("Unauthorized.", 401);
  }

  const userId = Number(req.user.sub);

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      Fakultas: true,
      created_at: true,
      roles: {
        select: {
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
      nidn: user.nidn_nip,
      fakultas: user.Fakultas,
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
    throw new HttpError("Unauthorized.", 401);
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
      // 1. Hubungkan ke relasi Fakultas menggunakan ID (pastikan dikonversi ke Number)
      Fakultas: fakultas ? { connect: { id: Number(fakultas) } } : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      // 2. Ganti fakultas: true menjadi fakultas_id atau relasi Fakultas
      fakultas_id: true,
      Fakultas: { select: { nama: true } }, // Asumsi kolom di tabel master adalah 'nama'
      roles: {
        select: { roles: true },
      },
    },
  });

  return res.status(200).json({
    message: "Profile updated successfully.",
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      nidn: updated.nidn_nip,
      fakultas_id: updated.fakultas_id,
      nama_fakultas: updated.Fakultas?.nama,
      roles: updated.roles?.roles,
    },
  });
};

/**
 * GET /dosen/search?q=:query
 * Search dosen by nama atau NIDN
 */
export const searchDosenController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { q } = req.query as { q?: string };

    if (!q) {
      return res.status(400).json({
        message: "Query parameter 'q' tidak boleh kosong.",
      });
    }

    const results = await searchDosen(q);

    return res.status(200).json({
      message: "Search dosen berhasil.",
      data: results.map((dosen) => ({
        id: dosen.id,
        name: dosen.name,
        nidn: dosen.nidn_nip,
        email: dosen.email,
        fakultas: dosen.Fakultas,
      })),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[SEARCH_DOSEN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat search dosen.",
    });
  }
};

/**
 * GET /mahasiswa/search?q=:query
 * Search mahasiswa by nama atau NIM
 */
export const searchMahasiswaController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { q } = req.query as { q?: string };

    if (!q) {
      return res.status(400).json({
        message: "Query parameter 'q' tidak boleh kosong.",
      });
    }

    const results = await searchMahasiswa(q);

    return res.status(200).json({
      message: "Search mahasiswa berhasil.",
      data: results.map((mahasiswa) => ({
        id: mahasiswa.id,
        name: mahasiswa.name,
        nim: mahasiswa.nidn_nip,
        email: mahasiswa.email,
        program_studi: mahasiswa.ProgramStudi,
      })),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[SEARCH_MAHASISWA_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat search mahasiswa.",
    });
  }
};
