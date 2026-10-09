import { prisma } from "../../prisma";
import { Prisma } from "../../generated/prisma/client";
import { KkmPeriodStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import type { KkmDplListQuery, KkmDplAssignInput, KkmDplCabutInput } from "./kkm-dpl.validation";

const PER_PAGE = 10;

const getMaksForDosen = async (periode_id: number, dosen_id: number, fallback?: number | null) => {
  const quota = await prisma.kkmDplQuota.findUnique({
    where: { periode_id_dosen_id: { periode_id, dosen_id } },
    select: { maksimal_kelompok: true },
  });
  return quota?.maksimal_kelompok ?? fallback ?? null;
};

export const getDplList = async (query: KkmDplListQuery) => {
  const page = query.page ?? 1;
  const skip = (page - 1) * PER_PAGE;

  // Ambil semua dosen (role DOSEN). Filter fakultas & search di where.
  const dosenWhere: Prisma.usersWhereInput = {};
  // role DOSEN = cari via roles.roles == "DOSEN"
  dosenWhere.roles = { roles: "DOSEN" };
  if (query.search) {
    const s = query.search;
    dosenWhere.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { nidn_nip: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
    ];
  }
  if (query.fakultas) {
    dosenWhere.Fakultas = { nama: { contains: query.fakultas, mode: "insensitive" } } as never;
  }

  const periodeFilter = query.periode_id ?? null;

  const [totalDosen, dosens] = await prisma.$transaction([
    prisma.users.count({ where: dosenWhere }),
    prisma.users.findMany({
      where: dosenWhere,
      orderBy: { name: "asc" },
      skip,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        nidn_nip: true,
        Fakultas: { select: { nama: true } },
        ProgramStudi: { select: { nama: true } },
      },
    }),
  ]);

  // Periode untuk fallback maksimal
  let periodeMaks: number | null | undefined = null;
  if (periodeFilter) {
    const p = await prisma.kkmPeriod.findUnique({
      where: { id: periodeFilter },
      select: { maks_kelompok_per_dosen: true },
    });
    periodeMaks = p?.maks_kelompok_per_dosen ?? null;
  }

  const dosenIds = dosens.map((d) => d.id);

  // Kelompok per dosen (filtered by periode if given)
  const kelompokWhere: Prisma.KkmKelompokWhereInput = {
    dpl_id: { in: dosenIds },
    ...(periodeFilter ? { periode_id: periodeFilter } : {}),
  };
  const kelompokRows = await prisma.kkmKelompok.findMany({
    where: kelompokWhere,
    select: {
      dpl_id: true,
      lokasi: { select: { desa: true } },
      periode: { select: { id: true, nama_periode: true, tahun_akademik: true } },
    },
  });

  const mapKelompokByDosen = new Map<number, typeof kelompokRows>();
  for (const k of kelompokRows) {
    if (k.dpl_id == null) continue;
    const arr = mapKelompokByDosen.get(k.dpl_id) ?? [];
    arr.push(k);
    mapKelompokByDosen.set(k.dpl_id, arr);
  }

  // Quota per dosen
  const quotaRows = periodeFilter
    ? await prisma.kkmDplQuota.findMany({
        where: { periode_id: periodeFilter, dosen_id: { in: dosenIds } },
        select: { dosen_id: true, maksimal_kelompok: true },
      })
    : [];
  const quotaMap = new Map<number, number>();
  for (const q of quotaRows) quotaMap.set(q.dosen_id, q.maksimal_kelompok);

  let rows = dosens.map((d) => {
    const kels = mapKelompokByDosen.get(d.id) ?? [];
    const isDplAktif = kels.length > 0;
    const status_dpl: "Aktif" | "Belum Ditugaskan" = isDplAktif ? "Aktif" : "Belum Ditugaskan";
    const maksimal = periodeFilter
      ? (quotaMap.get(d.id) ?? periodeMaks ?? null)
      : null;
    const desaSet = [...new Set(kels.map((k) => k.lokasi.desa))];
    const periodeInfo =
      kels[0]?.periode ??
      (periodeFilter
        ? null
        : null);

    return {
      dosen: {
        id: d.id,
        name: d.name,
        nidn_nip: d.nidn_nip,
        fakultas: (d.Fakultas as { nama: string } | null)?.nama ?? null,
        prodi: (d.ProgramStudi as { nama: string } | null)?.nama ?? null,
      },
      status_dpl,
      is_dpl_aktif: isDplAktif,
      kelompok: { count: kels.length, maksimal },
      desa_bimbingan: desaSet,
      periode: periodeInfo ? { id: periodeInfo.id, nama_periode: periodeInfo.nama_periode, tahun_akademik: periodeInfo.tahun_akademik } : null,
    };
  });

  // Filter status derived & desa search (post-db karena aggregated)
  if (query.status) {
    rows = rows.filter((r) => r.status_dpl === query.status);
  }
  if (query.search) {
    const s = query.search.toLowerCase();
    const hasDesaMatch = (desaList: string[]) => desaList.some((x) => x.toLowerCase().includes(s));
    rows = rows.filter(
      (r) =>
        r.dosen.name.toLowerCase().includes(s) ||
        (r.dosen.nidn_nip ?? "").toLowerCase().includes(s) ||
        hasDesaMatch(r.desa_bimbingan),
    );
  }

  return {
    data: rows,
    meta: {
      totalData: totalDosen,
      totalPages: Math.max(1, Math.ceil(totalDosen / PER_PAGE)),
      currentPage: page,
      limit: PER_PAGE,
    },
  };
};

export const getDplStats = async (periode_id: number) => {
  const periode = await prisma.kkmPeriod.findUnique({
    where: { id: periode_id },
    select: { id: true, nama_periode: true, tahun_akademik: true },
  });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const totalKelompok = await prisma.kkmKelompok.count({ where: { periode_id } });
  const totalDplAktif = await prisma.kkmKelompok.groupBy({
    by: ["dpl_id"],
    where: { periode_id, dpl_id: { not: null } },
  }).then((rows) => rows.length);

  const totalDosen = await prisma.users.count({ where: { roles: { roles: "DOSEN" } } as never });
  const belumDitugaskan = Math.max(0, totalDosen - totalDplAktif);
  const rataRata = totalDplAktif > 0 ? Number((totalKelompok > 0 ? totalKelompok / totalDplAktif : 0).toFixed(1)) : 0;

  // Lebih akurat: rata-rata kelompok ter-assign per DPL aktif
  const assignedKelompok = await prisma.kkmKelompok.count({
    where: { periode_id, dpl_id: { not: null } },
  });
  const rataRataBimbingan = totalDplAktif > 0 ? Number((assignedKelompok / totalDplAktif).toFixed(1)) : 0;

  return {
    periode,
    total_dpl_aktif: totalDplAktif,
    belum_ditugaskan: belumDitugaskan,
    total_kelompok: totalKelompok,
    rata_rata_bimbingan: rataRataBimbingan,
    // alias untuk FE lama
    _debug: { totalDosen, assignedKelompok, rataRataAlt: rataRata },
  };
};

export const searchDosen = async (search: string | undefined, limit = 20) => {
  const where: Prisma.usersWhereInput = {
    roles: { roles: "DOSEN" } as never,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { nidn_nip: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await prisma.users.findMany({
    where,
    take: limit,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nidn_nip: true,
      Fakultas: { select: { nama: true } },
      ProgramStudi: { select: { nama: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    nidn_nip: r.nidn_nip,
    fakultas: (r.Fakultas as { nama: string } | null)?.nama ?? null,
    prodi: (r.ProgramStudi as { nama: string } | null)?.nama ?? null,
  }));
};

export const getKelompokForAssign = async (params: {
  periode_id: number;
  unassigned_only?: boolean;
  search?: string;
}) => {
  const where: Prisma.KkmKelompokWhereInput = {
    periode_id: params.periode_id,
    ...(params.unassigned_only ? { dpl_id: null } : {}),
    ...(params.search
      ? {
          OR: [
            { nama: { contains: params.search, mode: "insensitive" } },
            { lokasi: { desa: { contains: params.search, mode: "insensitive" } } },
            { lokasi: { kecamatan: { contains: params.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const rows = await prisma.kkmKelompok.findMany({
    where,
    orderBy: { nama: "asc" },
    include: {
      lokasi: { select: { desa: true, kecamatan: true, kabupaten: true, kuota: true } },
      dpl: { select: { id: true, name: true } },
    },
  });
  return rows;
};

export const assignDpl = async (input: KkmDplAssignInput) => {
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: input.periode_id } });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);
  if (periode.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode sudah SELESAI, tidak bisa menugaskan DPL.", 400);
  }

  const dosen = await prisma.users.findUnique({
    where: { id: input.dosen_id },
    include: { roles: true },
  });
  if (!dosen) throw new HttpError("Dosen tidak ditemukan.", 404);
  if (dosen.roles.roles !== "DOSEN") {
    throw new HttpError("User bukan DOSEN.", 400);
  }

  if (periode.maks_kelompok_per_dosen != null && input.maksimal_kelompok > periode.maks_kelompok_per_dosen) {
    throw new HttpError(
      `Maksimal kelompok per dosen untuk periode ini adalah ${periode.maks_kelompok_per_dosen}.`,
      400,
    );
  }

  const kelompoks = await prisma.kkmKelompok.findMany({
    where: { id: { in: input.kelompok_ids } },
    select: { id: true, periode_id: true, dpl_id: true, lokasi_id: true },
  });
  if (kelompoks.length !== input.kelompok_ids.length) {
    throw new HttpError("Beberapa kelompok tidak ditemukan.", 404);
  }
  for (const k of kelompoks) {
    if (k.periode_id !== input.periode_id) {
      throw new HttpError(`Kelompok ${k.id} tidak berada di periode yang dipilih.`, 400);
    }
    if (k.dpl_id != null && k.dpl_id !== input.dosen_id) {
      throw new HttpError(`Kelompok ${k.id} sudah ditugaskan ke DPL lain.`, 409);
    }
  }

  if (input.kelompok_ids.length > input.maksimal_kelompok) {
    throw new HttpError(
      `Jumlah kelompok yang dipilih (${input.kelompok_ids.length}) melebihi maksimal ${input.maksimal_kelompok}.`,
      400,
    );
  }

  // Hitung existing assignment dosen di periode (exclude kelompok yang akan di-assign ulang ke dirinya)
  const existingCount = await prisma.kkmKelompok.count({
    where: { periode_id: input.periode_id, dpl_id: input.dosen_id, id: { notIn: input.kelompok_ids } },
  });
  const totalAfter = existingCount + input.kelompok_ids.length;
  if (totalAfter > input.maksimal_kelompok) {
    throw new HttpError(
      `Total kelompok DPL setelah penugasan (${totalAfter}) melebihi maksimal ${input.maksimal_kelompok} (sudah punya ${existingCount}).`,
      400,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.kkmDplQuota.upsert({
      where: { periode_id_dosen_id: { periode_id: input.periode_id, dosen_id: input.dosen_id } },
      update: { maksimal_kelompok: input.maksimal_kelompok },
      create: { periode_id: input.periode_id, dosen_id: input.dosen_id, maksimal_kelompok: input.maksimal_kelompok },
    });
    await tx.kkmKelompok.updateMany({
      where: { id: { in: input.kelompok_ids } },
      data: { dpl_id: input.dosen_id },
    });
    const updated = await tx.kkmKelompok.findMany({
      where: { id: { in: input.kelompok_ids } },
      include: { lokasi: true },
    });
    return updated;
  });

  return result;
};

export const cabutDpl = async (input: KkmDplCabutInput) => {
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: input.periode_id } });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const res = await prisma.kkmKelompok.updateMany({
    where: { periode_id: input.periode_id, dpl_id: input.dosen_id },
    data: { dpl_id: null },
  });
  return res;
};

export const generateKelompokFromLokasi = async (periode_id: number) => {
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: periode_id } });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const lokasiTanpaKelompok = await prisma.kkmLocation.findMany({
    where: { periode_id, kelompok: null },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (lokasiTanpaKelompok.length === 0) return { created: 0 };

  const existingCount = await prisma.kkmKelompok.count({ where: { periode_id } });

  const created = await prisma.$transaction(async (tx) => {
    let n = existingCount;
    for (const loc of lokasiTanpaKelompok) {
      n += 1;
      const nama = `Kelompok ${String(n).padStart(2, "0")}`;
      await tx.kkmKelompok.create({
        data: { periode_id, lokasi_id: loc.id, nama, dpl_id: null },
      });
    }
    return lokasiTanpaKelompok.length;
  });

  return { created };
};

export const isDplAktif = async (userId: number) => {
  const exists = await prisma.kkmKelompok.findFirst({
    where: { dpl_id: userId, periode: { status: KkmPeriodStatus.AKTIF } },
    select: { id: true },
  });
  return !!exists;
};
