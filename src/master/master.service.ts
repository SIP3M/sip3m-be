import { prisma } from "../prisma";

export const getAllFakultas = async () => {
  return await prisma.fakultas.findMany({
    orderBy: { nama: 'asc' }
  });
};

export const getProgramStudiByFakultasId = async (fakultasId: number) => {
  return await prisma.programStudi.findMany({
    where: { fakultas_id: fakultasId },
    orderBy: { nama: 'asc' }
  });
};