import { JenisKkm, KkmPeriodStatus } from "../../generated/prisma/enums";

export interface KkmPeriodResponse {
  id: number;
  nama_periode: string;
  tahun_akademik: string;
  tahun: number;
  jenis: JenisKkm;
  deskripsi: string | null;
  tgl_buka_daftar: Date | null;
  tgl_tutup_daftar: Date | null;
  tgl_pembekalan: Date | null;
  tgl_pelaksanaan: Date | null;
  tgl_penarikan: Date | null;
  deadline_laporan: Date | null;
  target_peserta: number;
  minimal_semester: number | null;
  maks_anggota_kelompok: number;
  boleh_lintas_fakultas: boolean;
  wajib_campur_prodi: boolean;
  assign_dpl_otomatis: boolean;
  maks_kelompok_per_dosen: number | null;
  status: KkmPeriodStatus;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface KkmPeriodQuery {
  page?: number;
  search?: string;
  status?: KkmPeriodStatus;
  jenis?: JenisKkm;
  tahun?: number;
  tahun_akademik?: string;
}
