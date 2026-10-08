import { prisma } from "../../prisma";
import { Prisma } from "../../generated/prisma/client";
import { KkmPeriodStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import type {
  CreateKkmPeriodInput,
  UpdateKkmPeriodInput,
  KkmPeriodQueryInput,
} from "./kkm-period.validation";

const KKM_PER_PAGE = 10;

const ensureUniqueName = async (
  nama_periode: string,
  tahun_akademik: string,
  excludeId?: number,
) => {
  const existing = await prisma.kkmPeriod.findFirst({
    where: {
      nama_periode: { equals: nama_periode, mode: "insensitive" },
      tahun_akademik,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(
      `Periode dengan nama "${nama_periode}" untuk tahun akademik ${tahun_akademik} sudah ada.`,
      409,
    );
  }
};

const enforceSingleActive = async (tx: Prisma.TransactionClient, activeId: number) => {
  await tx.kkmPeriod.updateMany({
    where: { status: KkmPeriodStatus.AKTIF, id: { not: activeId } },
    data: { status: KkmPeriodStatus.DIJADWALKAN },
  });
};

export const createKkmPeriod = async (input: CreateKkmPeriodInput, createdBy?: number) => {
  await ensureUniqueName(input.nama_periode, input.tahun_akademik);

  const isAktif = input.status === KkmPeriodStatus.AKTIF;

  if (isAktif) {
    return prisma.$transaction(async (tx) => {
      await tx.kkmPeriod.updateMany({
        where: { status: KkmPeriodStatus.AKTIF },
        data: { status: KkmPeriodStatus.DIJADWALKAN },
      });
      const created = await tx.kkmPeriod.create({
        data: {
          nama_periode: input.nama_periode,
          tahun_akademik: input.tahun_akademik,
          tahun: input.tahun,
          jenis: input.jenis,
          deskripsi: input.deskripsi ?? null,
          tgl_buka_daftar: input.tgl_buka_daftar ?? null,
          tgl_tutup_daftar: input.tgl_tutup_daftar ?? null,
          tgl_pembekalan: input.tgl_pembekalan ?? null,
          tgl_pelaksanaan: input.tgl_pelaksanaan ?? null,
          tgl_penarikan: input.tgl_penarikan ?? null,
          deadline_laporan: input.deadline_laporan ?? null,
          target_peserta: input.target_peserta ?? 0,
          minimal_semester: input.minimal_semester ?? null,
          maks_anggota_kelompok: input.maks_anggota_kelompok ?? 10,
          boleh_lintas_fakultas: input.boleh_lintas_fakultas ?? false,
          wajib_campur_prodi: input.wajib_campur_prodi ?? false,
          assign_dpl_otomatis: input.assign_dpl_otomatis ?? false,
          maks_kelompok_per_dosen: input.maks_kelompok_per_dosen ?? null,
          status: KkmPeriodStatus.AKTIF,
          created_by: createdBy ?? null,
        },
      });
      return created;
    });
  }

  const created = await prisma.kkmPeriod.create({
    data: {
      nama_periode: input.nama_periode,
      tahun_akademik: input.tahun_akademik,
      tahun: input.tahun,
      jenis: input.jenis,
      deskripsi: input.deskripsi ?? null,
      tgl_buka_daftar: input.tgl_buka_daftar ?? null,
      tgl_tutup_daftar: input.tgl_tutup_daftar ?? null,
      tgl_pembekalan: input.tgl_pembekalan ?? null,
      tgl_pelaksanaan: input.tgl_pelaksanaan ?? null,
      tgl_penarikan: input.tgl_penarikan ?? null,
      deadline_laporan: input.deadline_laporan ?? null,
      target_peserta: input.target_peserta ?? 0,
      minimal_semester: input.minimal_semester ?? null,
      maks_anggota_kelompok: input.maks_anggota_kelompok ?? 10,
      boleh_lintas_fakultas: input.boleh_lintas_fakultas ?? false,
      wajib_campur_prodi: input.wajib_campur_prodi ?? false,
      assign_dpl_otomatis: input.assign_dpl_otomatis ?? false,
      maks_kelompok_per_dosen: input.maks_kelompok_per_dosen ?? null,
      status: input.status ?? KkmPeriodStatus.DRAFT,
      created_by: createdBy ?? null,
    },
  });
  return created;
};

export const getAllKkmPeriods = async (query: KkmPeriodQueryInput) => {
  const page = query.page ?? 1;
  const skip = (page - 1) * KKM_PER_PAGE;

  const where: Prisma.KkmPeriodWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.jenis ? { jenis: query.jenis } : {}),
    ...(query.tahun ? { tahun: query.tahun } : {}),
    ...(query.tahun_akademik ? { tahun_akademik: query.tahun_akademik } : {}),
    ...(query.search
      ? {
          OR: [
            { nama_periode: { contains: query.search, mode: "insensitive" } },
            { tahun_akademik: { contains: query.search, mode: "insensitive" } },
            { deskripsi: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [totalData, data] = await prisma.$transaction([
    prisma.kkmPeriod.count({ where }),
    prisma.kkmPeriod.findMany({
      where,
      orderBy: [{ status: "asc" }, { created_at: "desc" }],
      skip,
      take: KKM_PER_PAGE,
    }),
  ]);

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / KKM_PER_PAGE)),
      currentPage: page,
      limit: KKM_PER_PAGE,
    },
  };
};

export const getActiveKkmPeriod = async () => {
  const active = await prisma.kkmPeriod.findFirst({
    where: { status: KkmPeriodStatus.AKTIF },
    orderBy: { updated_at: "desc" },
  });
  return active;
};

export const getKkmPeriodById = async (id: number) => {
  const period = await prisma.kkmPeriod.findUnique({ where: { id } });
  if (!period) throw new HttpError("Periode KKM tidak ditemukan.", 404);
  return period;
};

export const updateKkmPeriod = async (
  id: number,
  input: UpdateKkmPeriodInput,
) => {
  const existing = await prisma.kkmPeriod.findUnique({ where: { id } });
  if (!existing) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const nextNama = input.nama_periode ?? existing.nama_periode;
  const nextTahunAkademik = input.tahun_akademik ?? existing.tahun_akademik;
  if (input.nama_periode || input.tahun_akademik) {
    await ensureUniqueName(nextNama, nextTahunAkademik, id);
  }

  const nextStatus = (input.status as KkmPeriodStatus | undefined) ?? existing.status;
  const willBeAktif = nextStatus === KkmPeriodStatus.AKTIF;

  if (willBeAktif) {
    return prisma.$transaction(async (tx) => {
      await enforceSingleActive(tx, id);
      const updated = await tx.kkmPeriod.update({
        where: { id },
        data: {
          nama_periode: input.nama_periode ?? undefined,
          tahun_akademik: input.tahun_akademik ?? undefined,
          tahun: input.tahun ?? undefined,
          jenis: input.jenis ?? undefined,
          deskripsi: input.deskripsi !== undefined ? (input.deskripsi ?? null) : undefined,
          tgl_buka_daftar: input.tgl_buka_daftar !== undefined ? (input.tgl_buka_daftar ?? null) : undefined,
          tgl_tutup_daftar: input.tgl_tutup_daftar !== undefined ? (input.tgl_tutup_daftar ?? null) : undefined,
          tgl_pembekalan: input.tgl_pembekalan !== undefined ? (input.tgl_pembekalan ?? null) : undefined,
          tgl_pelaksanaan: input.tgl_pelaksanaan !== undefined ? (input.tgl_pelaksanaan ?? null) : undefined,
          tgl_penarikan: input.tgl_penarikan !== undefined ? (input.tgl_penarikan ?? null) : undefined,
          deadline_laporan: input.deadline_laporan !== undefined ? (input.deadline_laporan ?? null) : undefined,
          target_peserta: input.target_peserta ?? undefined,
          minimal_semester: input.minimal_semester !== undefined ? (input.minimal_semester ?? null) : undefined,
          maks_anggota_kelompok: input.maks_anggota_kelompok ?? undefined,
          boleh_lintas_fakultas: input.boleh_lintas_fakultas ?? undefined,
          wajib_campur_prodi: input.wajib_campur_prodi ?? undefined,
          assign_dpl_otomatis: input.assign_dpl_otomatis ?? undefined,
          maks_kelompok_per_dosen:
            input.maks_kelompok_per_dosen !== undefined ? (input.maks_kelompok_per_dosen ?? null) : undefined,
          status: KkmPeriodStatus.AKTIF,
        },
      });
      return updated;
    });
  }

  const updated = await prisma.kkmPeriod.update({
    where: { id },
    data: {
      nama_periode: input.nama_periode ?? undefined,
      tahun_akademik: input.tahun_akademik ?? undefined,
      tahun: input.tahun ?? undefined,
      jenis: input.jenis ?? undefined,
      deskripsi: input.deskripsi !== undefined ? (input.deskripsi ?? null) : undefined,
      tgl_buka_daftar: input.tgl_buka_daftar !== undefined ? (input.tgl_buka_daftar ?? null) : undefined,
      tgl_tutup_daftar: input.tgl_tutup_daftar !== undefined ? (input.tgl_tutup_daftar ?? null) : undefined,
      tgl_pembekalan: input.tgl_pembekalan !== undefined ? (input.tgl_pembekalan ?? null) : undefined,
      tgl_pelaksanaan: input.tgl_pelaksanaan !== undefined ? (input.tgl_pelaksanaan ?? null) : undefined,
      tgl_penarikan: input.tgl_penarikan !== undefined ? (input.tgl_penarikan ?? null) : undefined,
      deadline_laporan: input.deadline_laporan !== undefined ? (input.deadline_laporan ?? null) : undefined,
      target_peserta: input.target_peserta ?? undefined,
      minimal_semester: input.minimal_semester !== undefined ? (input.minimal_semester ?? null) : undefined,
      maks_anggota_kelompok: input.maks_anggota_kelompok ?? undefined,
      boleh_lintas_fakultas: input.boleh_lintas_fakultas ?? undefined,
      wajib_campur_prodi: input.wajib_campur_prodi ?? undefined,
      assign_dpl_otomatis: input.assign_dpl_otomatis ?? undefined,
      maks_kelompok_per_dosen:
        input.maks_kelompok_per_dosen !== undefined ? (input.maks_kelompok_per_dosen ?? null) : undefined,
      status: input.status ?? undefined,
    },
  });
  return updated;
};

export const activateKkmPeriod = async (id: number) => {
  const existing = await prisma.kkmPeriod.findUnique({ where: { id } });
  if (!existing) throw new HttpError("Periode KKM tidak ditemukan.", 404);
  if (existing.status === KkmPeriodStatus.AKTIF) {
    throw new HttpError("Periode sudah dalam status AKTIF.", 400);
  }
  if (existing.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode dengan status SELESAI tidak dapat diaktifkan kembali.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    await enforceSingleActive(tx, id);
    const updated = await tx.kkmPeriod.update({
      where: { id },
      data: { status: KkmPeriodStatus.AKTIF },
    });
    return updated;
  });
  return result;
};

export const updateKkmPeriodStatus = async (
  id: number,
  status: KkmPeriodStatus,
) => {
  const existing = await prisma.kkmPeriod.findUnique({ where: { id } });
  if (!existing) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  if (existing.status === status) {
    throw new HttpError(`Periode sudah berstatus ${status}.`, 400);
  }

  if (status === KkmPeriodStatus.AKTIF) {
    return activateKkmPeriod(id);
  }

  const updated = await prisma.kkmPeriod.update({
    where: { id },
    data: { status },
  });
  return updated;
};

/**
 * Cron: otomatis ubah AKTIF -> SELESAI jika tgl_penarikan sudah lewat.
 * Dipanggil oleh scheduler tiap hari 00:00.
 */
export const autoCompleteExpiredPeriods = async () => {
  const now = new Date();
  // Normalize to start of day for date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const result = await prisma.kkmPeriod.updateMany({
    where: {
      status: KkmPeriodStatus.AKTIF,
      tgl_penarikan: { not: null, lt: today },
    },
    data: { status: KkmPeriodStatus.SELESAI },
  });
  return result;
};

/**
 * Helper untuk modul Peserta KKM: cek limit target_peserta (Limit Validasi Aktif).
 * Throw jika kuota penuh.
 */
export const assertPesertaQuotaAvailable = async (
  periodeId: number,
  currentCount: number,
) => {
  const periode = await prisma.kkmPeriod.findUnique({
    where: { id: periodeId },
    select: { target_peserta: true, nama_periode: true },
  });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);
  if (periode.target_peserta > 0 && currentCount >= periode.target_peserta) {
    throw new HttpError(
      `Kuota periode "${periode.nama_periode}" telah penuh (${periode.target_peserta} peserta).`,
      400,
    );
  }
};
