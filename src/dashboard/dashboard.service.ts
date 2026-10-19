import { ROLES } from "../auth/role";
import {
  KkmPeriodStatus,
  KkmPesertaStatus,
  ProposalStatus,
} from "../generated/prisma/enums";
import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import { deriveStatus } from "../kkm/kelompok/kkm-kelompok.service";
import type { KelompokStatus } from "../kkm/kelompok/kkm-kelompok.service";
import {
  AdminDashboardData,
  KategoriChartItem,
  KkmDashboardData,
  KkmJumlahItem,
  KkmPeriodeRef,
  KkmStatusKelompokItem,
  StatusChartItem,
  TrendBulananItem,
} from "./dashboard.types";

const createMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getLastSixMonthBuckets = (): Array<{ key: string; label: string }> => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(
      start.getFullYear(),
      start.getMonth() + index,
      1,
    );
    return {
      key: createMonthKey(monthDate),
      label: monthDate.toLocaleString("id-ID", { month: "short" }),
    };
  });
};

export const getAdminDashboardData = async (): Promise<AdminDashboardData> => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalProposal,
    dosenAktif,
    proposalDisetujui,
    menungguReview,
    statusGroups,
    kategoriGroups,
    proposalCreatedAt,
  ] = await Promise.all([
    prisma.proposals.count(),
    prisma.users.count({
      where: {
        is_active: true,
        roles: {
          roles: ROLES.DOSEN,
        },
      },
    }),
    prisma.proposals.count({
      where: { status: ProposalStatus.ACCEPTED },
    }),
    prisma.proposals.count({
      where: {
        status: {
          in: [ProposalStatus.ADMIN_VERIFIED, ProposalStatus.UNDER_REVIEW],
        },
      },
    }),
    prisma.proposals.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.proposals.groupBy({
      by: ["skema"],
      _count: {
        _all: true,
      },
    }),
    prisma.proposals.findMany({
      where: {
        created_at: {
          gte: sixMonthsAgo,
          lte: now,
        },
      },
      select: {
        created_at: true,
      },
    }),
  ]);

  const statusMap = new Map<ProposalStatus, number>(
    statusGroups.map((row) => [row.status, row._count._all]),
  );

  const statusChart: StatusChartItem[] = Object.values(ProposalStatus).map(
    (status) => ({
      status,
      jumlah: statusMap.get(status) ?? 0,
    }),
  );

  const kategoriChart: KategoriChartItem[] = kategoriGroups.map((row) => ({
    skema: row.skema ?? "Tanpa Skema",
    jumlah: row._count._all,
  }));

  const monthBuckets = getLastSixMonthBuckets();
  const trendCountMap = new Map<string, number>(
    monthBuckets.map((month) => [month.key, 0]),
  );

  proposalCreatedAt.forEach((row) => {
    const key = createMonthKey(row.created_at);
    if (trendCountMap.has(key)) {
      const current = trendCountMap.get(key) ?? 0;
      trendCountMap.set(key, current + 1);
    }
  });

  const trendBulanan: TrendBulananItem[] = monthBuckets.map((month) => ({
    bulan: month.label,
    jumlah: trendCountMap.get(month.key) ?? 0,
  }));

  return {
    summaryCards: {
      totalProposal,
      dosenAktif,
      proposalDisetujui,
      menungguReview,
    },
    statusChart,
    kategoriChart,
    trendBulanan,
  };
};

// =============================================
// Dashboard KKM
// =============================================

const KELOMPOK_STATUS_LABEL: Record<KelompokStatus, string> = {
  AKTIF: "Aktif",
  BELUM_LENGKAP: "Belum Lengkap",
  BERMASALAH: "Bermasalah",
};

const toSortedJumlah = (counts: Map<string, number>): KkmJumlahItem[] =>
  [...counts.entries()]
    .map(([nama, jumlah]) => ({ nama, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama));

// Hitung status tiap kelompok memakai deriveStatus yang sudah ada
// (AKTIF >= 80% kuota, BELUM_LENGKAP 50-<80%, BERMASALAH <50%).
const buildStatusKelompok = (
  rows: Array<{
    lokasi: { kuota: number } | null;
    _count: { peserta: number };
  }>,
): KkmStatusKelompokItem[] => {
  const counts: Record<KelompokStatus, number> = {
    AKTIF: 0,
    BELUM_LENGKAP: 0,
    BERMASALAH: 0,
  };

  for (const row of rows) {
    const status = deriveStatus(row._count.peserta, row.lokasi?.kuota ?? 0);
    counts[status] += 1;
  }

  return (Object.keys(counts) as KelompokStatus[]).map((status) => ({
    status,
    label: KELOMPOK_STATUS_LABEL[status],
    jumlah: counts[status],
  }));
};

// Resolusi periode: explicit id (404 jika tak ada), atau default periode AKTIF.
const resolvePeriode = async (periodeId?: number) => {
  if (periodeId !== undefined) {
    const periode = await prisma.kkmPeriod.findUnique({
      where: { id: periodeId },
    });

    if (!periode) {
      throw new HttpError(
        `Periode KKM dengan ID ${periodeId} tidak ditemukan.`,
        404,
      );
    }

    return periode;
  }

  return prisma.kkmPeriod.findFirst({
    where: { status: KkmPeriodStatus.AKTIF },
    orderBy: { created_at: "desc" },
  });
};

export const getKkmDashboardData = async (
  periodeId?: number,
): Promise<KkmDashboardData> => {
  // 1. Resolusi periode: explicit id, atau default periode AKTIF.
  const periode = await resolvePeriode(periodeId);

  // Belum ada periode (aktif) -> respons ter-null dgn angka 0, bukan error.
  if (!periode) {
    return {
      periode: null,
      summary_cards: {
        total_peserta: 0,
        total_kelompok: 0,
        total_desa: 0,
        total_dpl: 0,
        belum_dapat_kelompok: 0,
        menunggu_verifikasi: 0,
      },
      peserta_per_prodi: [],
      status_kelompok: buildStatusKelompok([]),
      distribusi_per_desa: [],
    };
  }

  const periodeRef: KkmPeriodeRef = {
    id: periode.id,
    nama_periode: periode.nama_periode,
    tahun_akademik: periode.tahun_akademik,
    status: periode.status,
  };

  // 2. Agregasi paralel (tanpa ubah schema).
  const [
    totalPeserta,
    totalKelompok,
    totalDesa,
    dplGroups,
    belumDapatKelompok,
    menungguVerifikasi,
    kelompokRows,
    pesertaRows,
  ] = await Promise.all([
    prisma.kkmPeserta.count({ where: { periode_id: periode.id } }),
    prisma.kkmKelompok.count({ where: { periode_id: periode.id } }),
    prisma.kkmLocation.count({ where: { periode_id: periode.id } }),
    // distinct dpl_id pada kelompok periode ini (dpl null tidak dihitung)
    prisma.kkmKelompok.groupBy({
      by: ["dpl_id"],
      where: { periode_id: periode.id, dpl_id: { not: null } },
    }),
    prisma.kkmPeserta.count({
      where: { periode_id: periode.id, kelompok_id: null },
    }),
    prisma.kkmPeserta.count({
      where: { periode_id: periode.id, status: KkmPesertaStatus.PENDING },
    }),
    prisma.kkmKelompok.findMany({
      where: { periode_id: periode.id },
      select: {
        lokasi: { select: { kuota: true } },
        _count: { select: { peserta: true } },
      },
    }),
    // 1 fetch dipakai untuk 2 chart (prodi + desa) -> group by di JS.
    prisma.kkmPeserta.findMany({
      where: { periode_id: periode.id },
      select: {
        user: { select: { ProgramStudi: { select: { nama: true } } } },
        kelompok: { select: { lokasi: { select: { desa: true } } } },
      },
    }),
  ]);

  // 3. Distribusi prodi (semua peserta) & desa (hanya yang sudah punya kelompok).
  const prodiCounts = new Map<string, number>();
  const desaCounts = new Map<string, number>();

  for (const row of pesertaRows) {
    const prodi = row.user.ProgramStudi?.nama ?? "Tanpa Prodi";
    prodiCounts.set(prodi, (prodiCounts.get(prodi) ?? 0) + 1);

    const desa = row.kelompok?.lokasi?.desa;
    if (desa) {
      desaCounts.set(desa, (desaCounts.get(desa) ?? 0) + 1);
    }
  }

  return {
    periode: periodeRef,
    summary_cards: {
      total_peserta: totalPeserta,
      total_kelompok: totalKelompok,
      total_desa: totalDesa,
      total_dpl: dplGroups.length,
      belum_dapat_kelompok: belumDapatKelompok,
      menunggu_verifikasi: menungguVerifikasi,
    },
    peserta_per_prodi: toSortedJumlah(prodiCounts),
    status_kelompok: buildStatusKelompok(kelompokRows),
    distribusi_per_desa: toSortedJumlah(desaCounts),
  };
};
