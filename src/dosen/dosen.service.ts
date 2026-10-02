import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";

/**
 * Search dosen by nama atau NIDN
 */
export const searchDosen = async (query: string) => {
  if (!query || query.trim().length === 0) {
    throw new HttpError("Query search tidak boleh kosong.", 400);
  }

  const searchQuery = query.trim();

  const dosen = await prisma.users.findMany({
    where: {
      AND: [
        {
          roles: {
            roles: "DOSEN",
          },
        },
        {
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              nidn_nip: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      nidn_nip: true,
      email: true,
      Fakultas: {
        select: {
          id: true,
          nama: true,
        },
      },
    },
    take: 10, // Limit hasil untuk performa
  });

  return dosen;
};

/**
 * Search mahasiswa by nama atau NIM
 */
export const searchMahasiswa = async (query: string) => {
  if (!query || query.trim().length === 0) {
    throw new HttpError("Query search tidak boleh kosong.", 400);
  }

  const searchQuery = query.trim();

  const mahasiswa = await prisma.users.findMany({
    where: {
      AND: [
        {
          roles: {
            roles: "MAHASISWA",
          },
        },
        {
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              nidn_nip: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      nidn_nip: true,
      email: true,
      ProgramStudi: {
        select: {
          id: true,
          nama: true,
        },
      },
    },
    take: 10, // Limit hasil untuk performa
  });

  return mahasiswa;
};
