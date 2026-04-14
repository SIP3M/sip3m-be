import { ROLES } from "../auth/role";
import { ProposalStatus } from "../generated/prisma/enums";
import { prisma } from "../prisma";
import {
  AdminDashboardData,
  KategoriChartItem,
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
