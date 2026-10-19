import { ProposalStatus } from "../generated/prisma/enums";
import type { KelompokStatus } from "../kkm/kelompok/kkm-kelompok.service";

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

// =============================================
// Dashboard KKM
// =============================================

export interface KkmPeriodeRef {
  id: number;
  nama_periode: string;
  tahun_akademik: string;
  status: string;
}

export interface KkmSummaryCards {
  total_peserta: number;
  total_kelompok: number;
  total_desa: number;
  total_dpl: number;
  belum_dapat_kelompok: number;
  menunggu_verifikasi: number;
}

export interface KkmJumlahItem {
  nama: string;
  jumlah: number;
}

export interface KkmStatusKelompokItem {
  status: KelompokStatus;
  label: string;
  jumlah: number;
}

export interface KkmDashboardData {
  periode: KkmPeriodeRef | null;
  summary_cards: KkmSummaryCards;
  peserta_per_prodi: KkmJumlahItem[];
  status_kelompok: KkmStatusKelompokItem[];
  distribusi_per_desa: KkmJumlahItem[];
}
