import { prisma } from "../../prisma";
import { Prisma } from "../../generated/prisma/client";
import { KkmPeriodStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import type {
  CreateKkmLocationInput,
  UpdateKkmLocationInput,
  KkmLocationQueryInput,
} from "./kkm-location.validation";

const PER_PAGE = 10;

// terisi masih 0 sampai modul Kelompok/Peserta ada; disiapkan untuk agregasi nanti
const toDerived = (row: {
  id: number;
  periode_id: number;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  kuota: number;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  periode?: { id: number; nama_periode: string; tahun_akademik: string; status: string };
}) => {
  const terisi = 0;
  const status: "Tersedia" | "Penuh" = terisi >= row.kuota ? "Penuh" : "Tersedia";
  return { ...row, terisi, status };
};

const ensurePeriodeWritable = async (periode_id: number) => {
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: periode_id } });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);
  if (periode.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode sudah SELESAI, tidak bisa tambah/edit lokasi.", 400);
  }
  return periode;
};

const ensureUniqueDesa = async (
  periode_id: number,
  kabupaten: string,
  kecamatan: string,
  desa: string,
  excludeId?: number,
) => {
  const existing = await prisma.kkmLocation.findFirst({
    where: {
      periode_id,
      kabupaten: { equals: kabupaten, mode: "insensitive" },
      kecamatan: { equals: kecamatan, mode: "insensitive" },
      desa: { equals: desa, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(
      `Desa "${desa}" di Kec. ${kecamatan}, Kab. ${kabupaten} sudah ada di periode ini.`,
      409,
    );
  }
};

export const createKkmLocation = async (input: CreateKkmLocationInput, createdBy?: number) => {
  await ensurePeriodeWritable(input.periode_id);
  await ensureUniqueDesa(input.periode_id, input.kabupaten, input.kecamatan, input.desa);

  const created = await prisma.kkmLocation.create({
    data: {
      periode_id: input.periode_id,
      kabupaten: input.kabupaten.trim(),
      kecamatan: input.kecamatan.trim(),
      desa: input.desa.trim(),
      kuota: input.kuota,
      created_by: createdBy ?? null,
    },
    include: { periode: { select: { id: true, nama_periode: true, tahun_akademik: true, status: true } } },
  });
  return toDerived(created as never);
};

export const getAllKkmLocations = async (query: KkmLocationQueryInput) => {
  const page = query.page ?? 1;
  const skip = (page - 1) * PER_PAGE;

  const where: Prisma.KkmLocationWhereInput = {
    ...(query.periode_id ? { periode_id: query.periode_id } : {}),
    ...(query.kecamatan ? { kecamatan: { contains: query.kecamatan, mode: "insensitive" } } : {}),
    ...(query.kabupaten ? { kabupaten: { contains: query.kabupaten, mode: "insensitive" } } : {}),
    ...(query.search
      ? {
          OR: [
            { desa: { contains: query.search, mode: "insensitive" } },
            { kecamatan: { contains: query.search, mode: "insensitive" } },
            { kabupaten: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [totalData, rows] = await prisma.$transaction([
    prisma.kkmLocation.count({ where }),
    prisma.kkmLocation.findMany({
      where,
      orderBy: [{ kecamatan: "asc" }, { desa: "asc" }],
      skip,
      take: PER_PAGE,
      include: {
        periode: { select: { id: true, nama_periode: true, tahun_akademik: true, status: true } },
      },
    }),
  ]);

  let data = rows.map((r) => toDerived(r as never));

  if (query.status) {
    data = data.filter((d) => d.status === query.status);
  }

  return {
    data,
    meta: {
      totalData: query.status ? data.length : totalData,
      totalPages: Math.max(1, Math.ceil((query.status ? data.length : totalData) / PER_PAGE)),
      currentPage: page,
      limit: PER_PAGE,
      note: "terisi masih 0 sampai modul Kelompok/Peserta ada",
    },
  };
};

export const getKkmLocationById = async (id: number) => {
  const row = await prisma.kkmLocation.findUnique({
    where: { id },
    include: { periode: { select: { id: true, nama_periode: true, tahun_akademik: true, status: true } } },
  });
  if (!row) throw new HttpError("Lokasi KKM tidak ditemukan.", 404);
  return toDerived(row as never);
};

export const updateKkmLocation = async (id: number, input: UpdateKkmLocationInput) => {
  const existing = await prisma.kkmLocation.findUnique({ where: { id } });
  if (!existing) throw new HttpError("Lokasi KKM tidak ditemukan.", 404);

  const periode = await prisma.kkmPeriod.findUnique({ where: { id: existing.periode_id } });
  if (periode?.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode sudah SELESAI, lokasi tidak bisa diedit.", 400);
  }

  const nextKab = input.kabupaten ?? existing.kabupaten;
  const nextKec = input.kecamatan ?? existing.kecamatan;
  const nextDesa = input.desa ?? existing.desa;

  if (input.kabupaten || input.kecamatan || input.desa) {
    await ensureUniqueDesa(existing.periode_id, nextKab, nextKec, nextDesa, id);
  }

  const updated = await prisma.kkmLocation.update({
    where: { id },
    data: {
      kabupaten: input.kabupaten?.trim() ?? undefined,
      kecamatan: input.kecamatan?.trim() ?? undefined,
      desa: input.desa?.trim() ?? undefined,
      kuota: input.kuota ?? undefined,
    },
    include: { periode: { select: { id: true, nama_periode: true, tahun_akademik: true, status: true } } },
  });
  return toDerived(updated as never);
};

export const deleteKkmLocation = async (id: number) => {
  const existing = await prisma.kkmLocation.findUnique({ where: { id } });
  if (!existing) throw new HttpError("Lokasi KKM tidak ditemukan.", 404);
  await prisma.kkmLocation.delete({ where: { id } });
  return { id };
};

export const getKkmLocationStats = async (periode_id: number) => {
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: periode_id } });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const rows = await prisma.kkmLocation.findMany({
    where: { periode_id },
    select: { kecamatan: true, kabupaten: true, kuota: true },
  });

  const map = new Map<string, { kecamatan: string; kabupaten: string; jumlah_desa: number; kuota: number; terisi: number }>();
  for (const r of rows) {
    const key = `${r.kabupaten}||${r.kecamatan}`;
    const cur = map.get(key) ?? { kecamatan: r.kecamatan, kabupaten: r.kabupaten, jumlah_desa: 0, kuota: 0, terisi: 0 };
    cur.jumlah_desa += 1;
    cur.kuota += r.kuota;
    map.set(key, cur);
  }

  const per_kecamatan = [...map.values()].sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));

  return {
    periode: { id: periode.id, nama_periode: periode.nama_periode, tahun_akademik: periode.tahun_akademik },
    total_desa: rows.length,
    total_kecamatan: map.size,
    total_kuota: rows.reduce((s, r) => s + r.kuota, 0),
    total_terisi: 0,
    per_kecamatan,
  };
};
