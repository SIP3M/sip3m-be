import { StatusPencairanDana } from "../generated/prisma/enums";

export interface FinanceSummary {
  total_anggaran_hibah: number;
  dana_terserap: number;
  sisa_anggaran: number;
}

export interface GetDisbursementsFilters {
  status?: StatusPencairanDana;
  project_id?: number;
  page?: number;
  limit?: number;
}
