import { PrismaClient, JabatanKelompokMaster } from "../../generated/prisma/client";
import { HttpError } from "../../common/errors/http-error";
import {
  CreateJabatanMasterDTO,
  UpdateJabatanMasterDTO,
} from "./jabatan-master.validation";

const prisma = new PrismaClient();

export const getAllJabatanMaster = async (): Promise<JabatanKelompokMaster[]> => {
  return prisma.jabatanKelompokMaster.findMany({
    orderBy: { id: "asc" },
  });
};

export const getJabatanMasterById = async (
  id: number,
): Promise<JabatanKelompokMaster> => {
  const jabatan = await prisma.jabatanKelompokMaster.findUnique({
    where: { id },
  });
  if (!jabatan)
    throw new HttpError("Jabatan tidak ditemukan.", 404);
  return jabatan;
};

export const createJabatanMaster = async (
  data: CreateJabatanMasterDTO,
): Promise<JabatanKelompokMaster> => {
  // Cek duplikat nama
  const existing = await prisma.jabatanKelompokMaster.findUnique({
    where: { nama: data.nama },
  });
  if (existing)
    throw new HttpError(`Jabatan "${data.nama}" sudah ada.`, 409);

  return prisma.jabatanKelompokMaster.create({
    data: {
      nama: data.nama,
      max_per_kelompok: data.max_per_kelompok ?? null,
    },
  });
};

export const updateJabatanMaster = async (
  id: number,
  data: UpdateJabatanMasterDTO,
): Promise<JabatanKelompokMaster> => {
  const jabatan = await getJabatanMasterById(id);

  // Cek duplikat nama (jika diubah)
  if (data.nama && data.nama !== jabatan.nama) {
    const existing = await prisma.jabatanKelompokMaster.findUnique({
      where: { nama: data.nama },
    });
    if (existing)
      throw new HttpError(`Jabatan "${data.nama}" sudah ada.`, 409);
  }

  return prisma.jabatanKelompokMaster.update({
    where: { id },
    data: {
      nama: data.nama ?? jabatan.nama,
      max_per_kelompok: data.max_per_kelompok ?? jabatan.max_per_kelompok,
    },
  });
};

export const deleteJabatanMaster = async (id: number): Promise<void> => {
  // Guard: pastikan jabatan ada (melempar 404 bila tidak).
  await getJabatanMasterById(id);

  // Cari peserta yang pakai jabatan ini
  const pesertaCount = await prisma.kkmPeserta.count({
    where: { jabatan_id: id },
  });

  if (pesertaCount > 0) {
    // Cari jabatan default ANGGOTA
    const anggotaJabatan = await prisma.jabatanKelompokMaster.findUnique({
      where: { nama: "ANGGOTA" },
    });
    if (!anggotaJabatan)
      throw new HttpError("Jabatan ANGGOTA tidak ditemukan di master.", 500);

    // Update semua peserta yang pakai jabatan ini ke ANGGOTA
    await prisma.kkmPeserta.updateMany({
      where: { jabatan_id: id },
      data: { jabatan_id: anggotaJabatan.id },
    });
  }

  // Delete jabatan
  await prisma.jabatanKelompokMaster.delete({
    where: { id },
  });
};
