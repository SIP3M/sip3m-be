import { prisma } from "../../prisma";
import { Prisma } from "../../generated/prisma/client";
import { KkmPesertaStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import type {
  KkmPesertaQuery,
  KkmPesertaBulkStatusInput,
  KkmPesertaAssignKelompokInput,
} from "./kkm-peserta.validation";

const PER_PAGE = 10;

export const getPesertaStats = async (periode_id: number) => {
  const periode = await prisma.kkmPeriod.findUnique({
    where: { id: periode_id },
    select: { id: true, nama_periode: true, tahun_akademik: true },
  });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const [total, verified, pending, rejected, belumKelompok] = await Promise.all([
    prisma.kkmPeserta.count({ where: { periode_id } }),
    prisma.kkmPeserta.count({ where: { periode_id, status: KkmPesertaStatus.VERIFIED } }),
    prisma.kkmPeserta.count({ where: { periode_id, status: KkmPesertaStatus.PENDING } }),
    prisma.kkmPeserta.count({ where: { periode_id, status: KkmPesertaStatus.REJECTED } }),
    prisma.kkmPeserta.count({ where: { periode_id, kelompok_id: null } }),
  ]);

  return {
    periode,
    total,
    verified,
    pending,
    rejected,
    belum_kelompok: belumKelompok,
  };
};

export const getAllPeserta = async (query: KkmPesertaQuery) => {
  const page = query.page ?? 1;
  const skip = (page - 1) * PER_PAGE;

  const where: Prisma.KkmPesertaWhereInput = {
    periode_id: query.periode_id,
    ...(query.status ? { status: query.status } : {}),
    ...(query.status_kelompok === "BelumDitempatkan" ? { kelompok_id: null } : {}),
    ...(query.status_kelompok === "SudahDitempatkan" ? { kelompok_id: { not: null } } : {}),
    ...(query.kelompok_id ? { kelompok_id: query.kelompok_id } : {}),
    ...(query.semester ? { user: { semester: query.semester } } : {}),
    ...(query.fakultas ? { user: { Fakultas: { nama: { contains: query.fakultas, mode: "insensitive" } } } as never } : {}),
    ...(query.prodi ? { user: { ProgramStudi: { nama: { contains: query.prodi, mode: "insensitive" } } } as never } : {}),
    ...(query.search
      ? {
          OR: [
            { user: { name: { contains: query.search, mode: "insensitive" } } },
            { user: { nidn_nip: { contains: query.search, mode: "insensitive" } } },
            { user: { ProgramStudi: { nama: { contains: query.search, mode: "insensitive" } } } as never },
            { kelompok: { nama: { contains: query.search, mode: "insensitive" } } },
            { kelompok: { lokasi: { desa: { contains: query.search, mode: "insensitive" } } } as never },
          ],
        }
      : {}),
  };

  const [totalData, rows] = await prisma.$transaction([
    prisma.kkmPeserta.count({ where }),
    prisma.kkmPeserta.findMany({
      where,
      orderBy: [{ created_at: "asc" }],
      skip,
      take: PER_PAGE,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nidn_nip: true,
            email: true,
            semester: true,
            Fakultas: { select: { nama: true } },
            ProgramStudi: { select: { nama: true } },
          },
        },
        kelompok: {
          select: {
            id: true,
            nama: true,
            lokasi: { select: { desa: true } },
          },
        },
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    periode_id: r.periode_id,
    user_id: r.user_id,
    nim: r.user.nidn_nip,
    nama: r.user.name,
    email: r.user.email,
    prodi: (r.user.ProgramStudi as { nama: string } | null)?.nama ?? null,
    fakultas: (r.user.Fakultas as { nama: string } | null)?.nama ?? null,
    semester: r.user.semester ?? null,
    status: r.status,
    kelompok: r.kelompok
      ? { id: r.kelompok.id, nama: r.kelompok.nama, desa: r.kelompok.lokasi?.desa ?? null }
      : null,
    status_kelompok: (r.kelompok_id == null ? "Belum Ditempatkan" : "Sudah Ditempatkan") as
      | "Belum Ditempatkan"
      | "Sudah Ditempatkan",
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / PER_PAGE)),
      currentPage: page,
      limit: PER_PAGE,
    },
  };
};

export const getPesertaById = async (id: number) => {
  const row = await prisma.kkmPeserta.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nidn_nip: true,
          email: true,
          semester: true,
          nomor_hp: true,
          alamat: true,
          Fakultas: { select: { nama: true } },
          ProgramStudi: { select: { nama: true } },
        },
      },
      kelompok: { select: { id: true, nama: true, lokasi: { select: { desa: true, kecamatan: true, kabupaten: true } } } },
      periode: { select: { id: true, nama_periode: true, tahun_akademik: true } },
    },
  });
  if (!row) throw new HttpError("Peserta KKM tidak ditemukan.", 404);
  return {
    id: row.id,
    periode: row.periode,
    status: row.status,
    kelompok: row.kelompok,
    status_kelompok: row.kelompok_id == null ? "Belum Ditempatkan" : "Sudah Ditempatkan",
    user: {
      id: row.user.id,
      nim: row.user.nidn_nip,
      nama: row.user.name,
      email: row.user.email,
      semester: row.user.semester,
      nomor_hp: row.user.nomor_hp,
      alamat: row.user.alamat,
      fakultas: (row.user.Fakultas as { nama: string } | null)?.nama ?? null,
      prodi: (row.user.ProgramStudi as { nama: string } | null)?.nama ?? null,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

/**
 * Kuota Verified: KkmPeriod.target_peserta WAJIB dicek untuk set VERIFIED.
 * Jika target_peserta = 0 (belum diset), arti BELUM ada batas — lewati validasi.
 */
export const bulkUpdateStatus = async (
  input: KkmPesertaBulkStatusInput & { verifierId?: number },
) => {
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: input.periode_id } });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const rows = await prisma.kkmPeserta.findMany({
    where: { id: { in: input.peserta_ids }, periode_id: input.periode_id },
    select: { id: true },
  });
  if (rows.length !== input.peserta_ids.length) {
    throw new HttpError("Beberapa peserta tidak ditemukan di periode ini.", 404);
  }

  if (input.status === KkmPesertaStatus.VERIFIED && periode.target_peserta > 0) {
    const verifiedCount = await prisma.kkmPeserta.count({
      where: { periode_id: input.periode_id, status: KkmPesertaStatus.VERIFIED },
    });
    const pendingToVerified = await prisma.kkmPeserta.count({
      where: { id: { in: input.peserta_ids }, status: { not: KkmPesertaStatus.VERIFIED } },
    });
    if (verifiedCount + pendingToVerified > periode.target_peserta) {
      throw new HttpError(`Kuota periode penuh (${periode.target_peserta}). Tidak bisa verifikasi lagi.`, 400);
    }
  }

  if (input.status === KkmPesertaStatus.VERIFIED && periode.minimal_semester != null) {
    const violating = await prisma.kkmPeserta.findMany({
      where: { id: { in: input.peserta_ids } },
      include: { user: { select: { semester: true, name: true } } },
    });
    const below = violating.filter((r) => (r.user.semester ?? 99) < periode.minimal_semester!);
    if (below.length > 0) {
      throw new HttpError(
        `${below.length} peserta belum memenuhi minimal semester ${periode.minimal_semester} (contoh: ${below[0].user.name}).`,
        400,
      );
    }
  }

  const isDecision =
    input.status === KkmPesertaStatus.VERIFIED ||
    input.status === KkmPesertaStatus.REJECTED;

  const res = await prisma.kkmPeserta.updateMany({
    where: { id: { in: input.peserta_ids } },
    data: {
      status: input.status,
      ...(isDecision
        ? {
            verified_by_id: input.verifierId ?? null,
            verified_at: new Date(),
            catatan_verifikasi: input.catatan_verifikasi?.trim() || null,
          }
        : {}),
    },
  });

  // Notifikasi in-app untuk mahasiswa yang keputusannya berubah.
  if (isDecision) {
    const rows = await prisma.kkmPeserta.findMany({
      where: { id: { in: input.peserta_ids } },
      select: { user_id: true, periode: { select: { nama_periode: true } } },
    });

    if (rows.length > 0) {
      await prisma.notifications.createMany({
        data: rows.map((row) => ({
          user_id: row.user_id,
          title:
            input.status === KkmPesertaStatus.VERIFIED
              ? "Pendaftaran KKM Terverifikasi"
              : "Pendaftaran KKM Ditolak",
          message:
            input.status === KkmPesertaStatus.VERIFIED
              ? `Pendaftaran Anda pada periode "${row.periode.nama_periode}" telah lolos verifikasi administrasi.`
              : `Pendaftaran Anda pada periode "${row.periode.nama_periode}" ditolak. Catatan: ${input.catatan_verifikasi ?? "-"}`,
        })),
      });
    }
  }

  return res;
};

export const assignKelompokBulk = async (input: KkmPesertaAssignKelompokInput) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: input.kelompok_id },
    select: { id: true, periode_id: true, lokasi: { select: { kuota: true } } },
  });
  if (!kelompok) throw new HttpError("Kelompok tidak ditemukan.", 404);

  const pesertas = await prisma.kkmPeserta.findMany({
    where: { id: { in: input.peserta_ids } },
    select: { id: true, periode_id: true, kelompok_id: true },
  });
  if (pesertas.length !== input.peserta_ids.length) {
    throw new HttpError("Beberapa peserta tidak ditemukan.", 404);
  }
  for (const p of pesertas) {
    if (p.periode_id !== kelompok.periode_id) {
      throw new HttpError(`Peserta ${p.id} beda periode dengan kelompok.`, 400);
    }
  }

  const countInKelompok = await prisma.kkmPeserta.count({ where: { kelompok_id: input.kelompok_id } });
  const kuota = kelompok.lokasi?.kuota ?? 9999;
  if (countInKelompok + input.peserta_ids.length > kuota) {
    throw new HttpError(`Kelompok penuh (kuota ${kuota}, sudah ${countInKelompok}).`, 400);
  }

  const res = await prisma.kkmPeserta.updateMany({
    where: { id: { in: input.peserta_ids } },
    data: { kelompok_id: input.kelompok_id },
  });
  return res;
};

export const updatePesertaStatus = async (
  id: number,
  status: KkmPesertaStatus,
  opts?: { verifierId?: number | null; catatan_verifikasi?: string },
) => {
  const existing = await prisma.kkmPeserta.findUnique({ where: { id }, include: { periode: true, user: true } });
  if (!existing) throw new HttpError("Peserta KKM tidak ditemukan.", 404);
  if (status === KkmPesertaStatus.VERIFIED && existing.periode.target_peserta > 0) {
    const verifiedCount = await prisma.kkmPeserta.count({
      where: { periode_id: existing.periode_id, status: KkmPesertaStatus.VERIFIED },
    });
    const willAdd = existing.status !== KkmPesertaStatus.VERIFIED ? 1 : 0;
    if (verifiedCount + willAdd > existing.periode.target_peserta) {
      throw new HttpError(`Kuota periode penuh (${existing.periode.target_peserta}).`, 400);
    }
  }

  const isDecision =
    status === KkmPesertaStatus.VERIFIED || status === KkmPesertaStatus.REJECTED;
  const catatan = opts?.catatan_verifikasi?.trim() || null;

  const updated = await prisma.kkmPeserta.update({
    where: { id },
    data: {
      status,
      ...(isDecision
        ? {
            verified_by_id: opts?.verifierId ?? null,
            verified_at: new Date(),
            catatan_verifikasi: catatan,
          }
        : {}),
    },
  });

  if (isDecision) {
    await prisma.notifications.create({
      data: {
        user_id: existing.user_id,
        title:
          status === KkmPesertaStatus.VERIFIED
            ? "Pendaftaran KKM Terverifikasi"
            : "Pendaftaran KKM Ditolak",
        message:
          status === KkmPesertaStatus.VERIFIED
            ? `Pendaftaran Anda pada periode "${existing.periode.nama_periode}" telah lolos verifikasi administrasi.`
            : `Pendaftaran Anda pada periode "${existing.periode.nama_periode}" ditolak. Catatan: ${catatan ?? "-"}`,
      },
    });
  }

  return updated;
};

export const exportPeserta = async (periode_id: number, filters: Omit<KkmPesertaQuery, "periode_id" | "page">) => {
  const where: Prisma.KkmPesertaWhereInput = {
    periode_id,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.status_kelompok === "BelumDitempatkan" ? { kelompok_id: null } : {}),
    ...(filters.status_kelompok === "SudahDitempatkan" ? { kelompok_id: { not: null } } : {}),
    ...(filters.semester ? { user: { semester: filters.semester } } as never : {}),
  };
  const rows = await prisma.kkmPeserta.findMany({
    where,
    orderBy: { created_at: "asc" },
    include: {
      user: {
        select: {
          name: true,
          nidn_nip: true,
          email: true,
          semester: true,
          Fakultas: { select: { nama: true } },
          ProgramStudi: { select: { nama: true } },
        },
      },
      kelompok: { select: { nama: true, lokasi: { select: { desa: true } } } },
    },
  });
  return rows.map((r) => ({
    NIM: r.user.nidn_nip,
    Nama: r.user.name,
    Prodi: (r.user.ProgramStudi as { nama: string } | null)?.nama ?? "",
    Fakultas: (r.user.Fakultas as { nama: string } | null)?.nama ?? "",
    Semester: r.user.semester,
    StatusVerifikasi: r.status,
    Kelompok: r.kelompok?.nama ?? "Belum Ditempatkan",
    Desa: r.kelompok?.lokasi?.desa ?? "",
  }));
};
