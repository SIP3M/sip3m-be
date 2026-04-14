import { ProposalStatus } from "../generated/prisma/enums";

export interface SummaryCards {
  totalProposal: number;
  dosenAktif: number;
  proposalDisetujui: number;
  menungguReview: number;
}

export interface StatusChartItem {
  status: ProposalStatus;
  jumlah: number;
}

export interface KategoriChartItem {
  skema: string;
  jumlah: number;
}

export interface TrendBulananItem {
  bulan: string;
  jumlah: number;
}

export interface AdminDashboardData {
  summaryCards: SummaryCards;
  statusChart: StatusChartItem[];
  kategoriChart: KategoriChartItem[];
  trendBulanan: TrendBulananItem[];
}
