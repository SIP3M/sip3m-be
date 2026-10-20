// Tipe untuk Portal Skema KKM (Jalur A — kartu memakai KkmPeriod sebagai "1 kartu").
// Saat model KkmSkema menyusul, struktur respons ini tetap — hanya sumber data yang berganti.

export interface SkemaTanggal {
  buka_daftar: string | null;
  tutup_daftar: string | null;
  pelaksanaan: string | null;
  penarikan: string | null;
}

export interface SkemaCard {
  id: number;
  nama: string;
  deskripsi: string | null;
  jenis: string; // REGULER | TEMATIK
  durasi_hari: number | null; // derive tgl_pelaksanaan -> tgl_penarikan
  tanggal: SkemaTanggal;
  kuota: number; // target_peserta
  terisi: number; // jumlah peserta VERIFIED (mengisi kuota)
  menunggu: number; // jumlah peserta PENDING (menunggu verifikasi)
  sisa: number; // max(0, kuota - terisi)
  persentase_terisi: number; // 0-100
  wilayah: string[]; // distinct kabupaten dari KkmLocation
  batas_daftar: string | null; // tgl_tutup_daftar
}

export interface SkemaPeriodeRef {
  id: number;
  nama_periode: string;
  tahun_akademik: string;
  jenis: string;
  status: string;
}

export interface SkemaStats {
  total_skema: number;
  akumulasi_kuota: number;
  akumulasi_terisi: number;
  batas_akhir: string | null; // tgl_tutup_daftar paling awal
}

export interface SkemaFilters {
  jenis: string[];
  wilayah: string[];
}

export interface SkemaPortalData {
  periode_aktif: SkemaPeriodeRef | null; // utk label header "Semester …"
  skema: SkemaCard[];
  stats: SkemaStats;
  filters: SkemaFilters;
}
