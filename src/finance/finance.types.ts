import { StatusPencairanDana } from "../generated/prisma/enums";

export interface FinanceSummary {
  total_anggaran_hibah: number;
  dana_terserap: number;
  sisa_anggaran: number;
  jumlah_proyek: number;
  menunggu_persetujuan: number;
  disetujui: number;
  tercairkan: number;
}

export interface GetFinanceProjectsFilters {
  status?: StatusPencairanDana;
  search?: string;
  skema?: string;
  tahun?: number;
  page?: number;
  limit?: number;
}
