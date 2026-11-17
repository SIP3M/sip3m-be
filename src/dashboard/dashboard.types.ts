import { ProposalStatus } from "../generated/prisma/enums";
import type { KelompokStatus } from "../kkm/kelompok/kkm-kelompok.service";

export interface AdminSummaryCards {
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

export interface FakultasChartItem {
  fakultas: string;
  jumlah: number;
}

export interface RecentProposalItem {
  id: number;
  title: string;
  status: ProposalStatus;
  created_at: Date;
}

export interface AdminDashboardData {
  summaryCards: AdminSummaryCards;
  statusChart: StatusChartItem[];
  kategoriChart: KategoriChartItem[];
  trendBulanan: TrendBulananItem[];
  fakultasChart: FakultasChartItem[];
  recentProposals: RecentProposalItem[];
  /** Tahun unik dari created_at proposal — untuk isi dropdown filter */
  tahunTersedia: number[];
}

// =============================================
// Dashboard Staff LPPM (fokus proposal penelitian)
// =============================================

export interface StaffSummaryCards {
  totalProposal: number;
  /** Proposal berstatus SUBMITTED — menunggu verifikasi administratif */
  perluVerifikasi: number;
  proposalDisetujui: number;
  dosenAktif: number;
}

export interface VerifikasiChartItem {
  label: string;
  jumlah: number;
}

export interface AktivitasHarianItem {
  /** Key ISO (YYYY-MM-DD) untuk keperluan mapping FE */
  tanggal: string;
  /** Label hari pendek, mis. "Sen" */
  hari: string;
  /** Proposal masuk (created_at) pada hari itu */
  masuk: number;
  /** Proposal diproses/diubah (updated_at) pada hari itu */
  diproses: number;
}

export interface ProposalPerluVerifikasiItem {
  id: number;
  title: string;
  faculty: string | null;
  status: ProposalStatus;
  created_at: Date;
}

/** Kunci prioritas — FE memetakan ke label, ikon, dan rute halaman. */
export type PrioritasKey = "verifikasi" | "plotting" | "review";

export interface PrioritasItem {
  key: PrioritasKey;
  jumlah: number;
}

export interface StaffDashboardData {
  summaryCards: StaffSummaryCards;
  /** Donut pipeline verifikasi — jumlahnya selalu = totalProposal */
  verifikasiChart: VerifikasiChartItem[];
  /** 7 hari terakhir (urut, paling akhir = hari ini) */
  aktivitasMingguan: AktivitasHarianItem[];
  /** Maks 5 proposal SUBMITTED, antrean terlama lebih dulu */
  proposalPerluVerifikasi: ProposalPerluVerifikasiItem[];
  /** Derive dari data: menunggu verifikasi / menunggu plotting / review berjalan */
  prioritas: PrioritasItem[];
  recentProposals: RecentProposalItem[];
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
