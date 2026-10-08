export interface KkmLocationWithDerived {
  id: number;
  periode_id: number;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  kuota: number;
  terisi: number;
  status: "Tersedia" | "Penuh";
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  periode?: { id: number; nama_periode: string; tahun_akademik: string; status: string };
}

export interface KkmLocationStats {
  total_desa: number;
  total_kecamatan: number;
  total_kuota: number;
  total_terisi: number;
  per_kecamatan: Array<{
    kecamatan: string;
    kabupaten: string;
    jumlah_desa: number;
    kuota: number;
    terisi: number;
  }>;
}
