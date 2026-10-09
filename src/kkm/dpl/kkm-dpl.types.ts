export interface KkmDplRow {
  dosen: {
    id: number;
    name: string;
    nidn_nip: string | null;
    fakultas: string | null;
    prodi: string | null;
  };
  status_dpl: "Aktif" | "Belum Ditugaskan";
  is_dpl_aktif: boolean;
  kelompok: { count: number; maksimal: number | null };
  desa_bimbingan: string[];
  periode: { id: number | null; nama_periode: string | null; tahun_akademik: string | null } | null;
}

export interface KkmDplStats {
  periode: { id: number; nama_periode: string; tahun_akademik: string } | null;
  total_dpl_aktif: number;
  belum_ditugaskan: number;
  total_kelompok: number;
  rata_rata_bimbingan: number;
}
