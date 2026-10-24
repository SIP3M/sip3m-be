import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";

// =============================================
// Read-only (publik — dipakai dropdown user/proposal)
// =============================================

export const getAllFakultas = async () => {
  return await prisma.fakultas.findMany({
    orderBy: { nama: "asc" },
    // _count bersifat additive — konsumen lama (dropdown) tetap aman.
    include: { _count: { select: { program_studi: true, users: true } } },
  });
};

export const getProgramStudiByFakultasId = async (fakultasId: number) => {
  return await prisma.programStudi.findMany({
    where: { fakultas_id: fakultasId },
    orderBy: { nama: "asc" },
    include: { _count: { select: { users: true } } },
  });
};

/** Seluruh program studi (untuk halaman kelola prodi datar) + fakultas & jumlah user. */
export const getAllProgramStudi = async () => {
  return await prisma.programStudi.findMany({
    orderBy: [{ fakultas_id: "asc" }, { nama: "asc" }],
    include: {
      fakultas: { select: { id: true, nama: true } },
      _count: { select: { users: true } },
    },
  });
};

// =============================================
// CRUD (khusus ADMIN_SISTEM)
// =============================================

/** Cari nama fakultas sama (case-insensitive), kecuali id tertentu. */
const findFakultasByName = (nama: string, excludeId?: number) =>
  prisma.fakultas.findFirst({
    where: {
      nama: { equals: nama, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

export const createFakultas = async (nama: string) => {
  if (await findFakultasByName(nama)) {
    throw new HttpError(`Fakultas "${nama}" sudah ada.`, 409);
  }
  return await prisma.fakultas.create({ data: { nama } });
};

export const updateFakultas = async (id: number, nama: string) => {
  const fakultas = await prisma.fakultas.findUnique({ where: { id } });
  if (!fakultas) throw new HttpError("Fakultas tidak ditemukan.", 404);

  if (await findFakultasByName(nama, id)) {
    throw new HttpError(`Fakultas "${nama}" sudah ada.`, 409);
  }

  return await prisma.fakultas.update({ where: { id }, data: { nama } });
};

export const deleteFakultas = async (id: number) => {
  const fakultas = await prisma.fakultas.findUnique({
    where: { id },
    include: { _count: { select: { program_studi: true, users: true } } },
  });
  if (!fakultas) throw new HttpError("Fakultas tidak ditemukan.", 404);

  const { program_studi: prodi, users } = fakultas._count;
  if (prodi > 0 || users > 0) {
    throw new HttpError(
      `Fakultas masih memiliki ${prodi} program studi dan ${users} user terkait. Hapus atau pindahkan data tersebut terlebih dahulu.`,
      409,
    );
  }

  await prisma.fakultas.delete({ where: { id } });
};

/** Cari nama prodi sama (case-insensitive) dalam satu fakultas. */
const findProdiByName = (fakultasId: number, nama: string, excludeId?: number) =>
  prisma.programStudi.findFirst({
    where: {
      fakultas_id: fakultasId,
      nama: { equals: nama, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

export const createProgramStudi = async (fakultasId: number, nama: string) => {
  const fakultas = await prisma.fakultas.findUnique({ where: { id: fakultasId } });
  if (!fakultas) throw new HttpError("Fakultas tidak ditemukan.", 404);

  if (await findProdiByName(fakultasId, nama)) {
    throw new HttpError(`Program studi "${nama}" sudah ada di fakultas ini.`, 409);
  }

  return await prisma.programStudi.create({
    data: { nama, fakultas_id: fakultasId },
  });
};

export const updateProgramStudi = async (id: number, nama: string) => {
  const prodi = await prisma.programStudi.findUnique({ where: { id } });
  if (!prodi) throw new HttpError("Program studi tidak ditemukan.", 404);

  if (await findProdiByName(prodi.fakultas_id, nama, id)) {
    throw new HttpError(`Program studi "${nama}" sudah ada di fakultas ini.`, 409);
  }

  return await prisma.programStudi.update({ where: { id }, data: { nama } });
};

export const deleteProgramStudi = async (id: number) => {
  const prodi = await prisma.programStudi.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!prodi) throw new HttpError("Program studi tidak ditemukan.", 404);

  if (prodi._count.users > 0) {
    throw new HttpError(
      `Program studi masih digunakan oleh ${prodi._count.users} user. Pindahkan user tersebut terlebih dahulu.`,
      409,
    );
  }

  await prisma.programStudi.delete({ where: { id } });
};
