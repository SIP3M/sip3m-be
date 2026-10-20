import type { KkmPeriodeRef } from "../../dashboard/dashboard.types";

// Status monitoring per kelompok (berbasis aktivitas & dokumen — beda dari deriveStatus kuota)
export type MonitoringStatus = "AKTIF" | "PERLU_PERHATIAN" | "BERMASALAH" | "SELESAI";

// Indikator kesehatan (alasan status) — ditampilkan sebagai chip "Indikator" pada tabel
export type MonitoringIndikator =
  | "NORMAL"
  | "DPL_BELUM_MONITORING"
  | "TIDAK_ADA_AKTIVITAS"
  | "LOGBOOK_KURANG";

// Tahapan kerja per kelompok (derived dari dokumen yang sudah diupload)
export type MonitoringTahapan =
  | "MONITORING_DPL"
  | "PROGRAM_KERJA"
  | "LOGBOOK_AKTIF"
  | "LAPORAN_AKHIR"
  | "SELESAI";

export interface MonitoringDpl {
  id: number | null;
  nama: string | null;
  last_monitored_at: string | null;
  terakhir: string | null; // humanized: "3 hari lalu" / "Belum pernah"
}

export interface MonitoringLogbook {
  jumlah: number; // total entri logbook
  delta: number; // entri 7 hari terakhir − entri 7 hari sebelumnya
}

export interface MonitoringRow {
  id: number;
  nama: string;
  jumlah_anggota: number;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  dpl: MonitoringDpl;
  logbook: MonitoringLogbook;
  tahapan: MonitoringTahapan;
  tahapan_label: string;
  progress: number; // 0-100
  indikator: MonitoringIndikator;
  indikator_label: string;
  status: MonitoringStatus;
  status_label: string;
}

export interface MonitoringStats {
  total_kelompok: number;
  kelompok_aktif: number;
  perlu_perhatian: number;
  bermasalah: number;
  selesai: number;
  rata_rata_progress: number;
}

export interface MonitoringFilterOption {
  id: number;
  nama: string;
}

export interface MonitoringFilterOptions {
  desa: string[];
  dpl: MonitoringFilterOption[];
}

export interface MonitoringResult {
  periode: KkmPeriodeRef | null;
  data: MonitoringRow[];
  meta: {
    totalData: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  stats: MonitoringStats;
  filters: MonitoringFilterOptions;
}
