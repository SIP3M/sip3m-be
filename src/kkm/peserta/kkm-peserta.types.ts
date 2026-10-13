import { KkmPesertaStatus } from "../../generated/prisma/enums";

export interface KkmPesertaRow {
  id: number;
  periode_id: number;
  user_id: number;
  nim: string | null;
  nama: string;
  prodi: string | null;
  fakultas: string | null;
  semester: number | null;
  status: KkmPesertaStatus;
  kelompok: { id: number; nama: string; desa: string | null } | null;
  status_kelompok: "Belum Ditempatkan" | "Sudah Ditempatkan";
  created_at: Date;
  updated_at: Date;
}

export interface KkmPesertaStats {
  periode: { id: number; nama_periode: string; tahun_akademik: string } | null;
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  belum_kelompok: number;
}
