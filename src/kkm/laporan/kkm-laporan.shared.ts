// =============================================
// Helper bersama modul Laporan KKM
// ---------------------------------------------
// Dipakai oleh service laporan mahasiswa (kkm-laporan.service.ts)
// dan service review admin/DPL (kkm-laporan-review.service.ts).
// =============================================

import { KkmKelompokDocumentType } from "../../generated/prisma/enums";
import { atJam, formatDeadline, DAY_MS } from "../common/kkm-deadline";

/** Jenis laporan kelompok yang masuk alur review (upload → review → revisi). */
export const JENIS_LAPORAN = [
  KkmKelompokDocumentType.LAPORAN_AWAL,
  KkmKelompokDocumentType.LAPORAN_MINGGUAN,
  KkmKelompokDocumentType.LAPORAN_AKHIR,
] as const;

export type JenisLaporan = (typeof JENIS_LAPORAN)[number];

export const JENIS_LABEL: Record<JenisLaporan, string> = {
  LAPORAN_AWAL: "Laporan Awal",
  LAPORAN_MINGGUAN: "Laporan Mingguan",
  LAPORAN_AKHIR: "Laporan Akhir",
};

/** Status turunan per baris (kelompok × jenis). */
export type StatusLaporan =
  | "BELUM_UPLOAD"
  | "MENUNGGU_REVIEW"
  | "DISETUJUI"
  | "REVISI"
  | "TERLAMBAT";

export const STATUS_LABEL: Record<StatusLaporan, string> = {
  BELUM_UPLOAD: "Belum Upload",
  MENUNGGU_REVIEW: "Menunggu Review",
  DISETUJUI: "Disetujui",
  REVISI: "Revisi",
  TERLAMBAT: "Terlambat",
};

/** Field deadline + jam per jenis laporan di KkmPeriod. */
type PeriodeDeadline = {
  tgl_penarikan?: Date | null;
  tgl_pelaksanaan?: Date | null;
  deadline_laporan?: Date | null;
  jam_laporan_kelompok?: string | null;
  deadline_laporan_awal?: Date | null;
  jam_laporan_awal?: string | null;
  deadline_laporan_mingguan?: Date | null;
  jam_laporan_mingguan?: string | null;
};

/** Deadline penutup unggahan per jenis (null = tanpa batas). */
export const deadlineOf = (periode: PeriodeDeadline, jenis: JenisLaporan): Date | null => {
  switch (jenis) {
    case KkmKelompokDocumentType.LAPORAN_AWAL:
      return periode.deadline_laporan_awal
        ? atJam(periode.deadline_laporan_awal, periode.jam_laporan_awal)
        : null;
    case KkmKelompokDocumentType.LAPORAN_MINGGUAN:
      return periode.deadline_laporan_mingguan
        ? atJam(periode.deadline_laporan_mingguan, periode.jam_laporan_mingguan)
        : null;
    case KkmKelompokDocumentType.LAPORAN_AKHIR:
    default:
      return periode.deadline_laporan
        ? atJam(periode.deadline_laporan, periode.jam_laporan_kelompok)
        : null;
  }
}

/**
 * Jendela unggahan per jenis:
 * - Laporan Akhir:    dibuka setelah Tanggal Penarikan (perilaku lama).
 * - Laporan Awal & Mingguan: dibuka saat Tanggal Pelaksanaan dimulai.
 * Keduanya ditutup pada deadline masing-masing (null = tanpa batas).
 */
export const jendelaForJenis = (
  periode: PeriodeDeadline,
  jenis: JenisLaporan,
): { bukaSetelah: Date | null; tutupPada: Date | null } => {
  const tutupPada = deadlineOf(periode, jenis);
  if (jenis === KkmKelompokDocumentType.LAPORAN_AKHIR) {
    return {
      bukaSetelah: periode.tgl_penarikan ? atJam(periode.tgl_penarikan, "23:59") : null,
      tutupPada,
    };
  }
  return {
    bukaSetelah: periode.tgl_pelaksanaan ? atJam(periode.tgl_pelaksanaan, "00:00") : null,
    tutupPada,
  };
};

export const alasanTertutupForJenis = (jenis: JenisLaporan, periode: PeriodeDeadline): string => {
  const label = JENIS_LABEL[jenis];
  if (jenis === KkmKelompokDocumentType.LAPORAN_AKHIR) {
    return periode.tgl_penarikan
      ? `${label} dibuka setelah kegiatan KKM selesai (${formatDeadline(
          atJam(periode.tgl_penarikan, "23:59"),
        )}).`
      : "Jadwal pelaksanaan KKM belum ditentukan, laporan belum dapat diunggah.";
  }
  return periode.tgl_pelaksanaan
    ? `${label} dibuka saat kegiatan KKM dimulai (${formatDeadline(
        atJam(periode.tgl_pelaksanaan, "00:00"),
      )}).`
    : "Jadwal pelaksanaan KKM belum ditentukan, laporan belum dapat diunggah.";
};

/**
 * Status turunan satu baris laporan:
 * - Ada dokumen  → status review dokumen (MENUNGGU_REVIEW / DISETUJUI / REVISI).
 * - Belum ada    → TERLAMBAT bila deadline sudah lewat, selain itu BELUM_UPLOAD.
 *   (Telat mengunggah tetap dihitung sebagai status review, bukan TERLAMBAT.)
 */
export const deriveStatusLaporan = (
  doc: { status_review: string } | null,
  deadline: Date | null,
  now: number = Date.now(),
): StatusLaporan => {
  if (doc) {
    if (doc.status_review === "DISETUJUI") return "DISETUJUI";
    if (doc.status_review === "REVISI") return "REVISI";
    return "MENUNGGU_REVIEW";
  }
  if (deadline && now > deadline.getTime()) return "TERLAMBAT";
  return "BELUM_UPLOAD";
};

/** Catatan di bawah kolom deadline (hanya untuk yang belum mengunggah). */
export const deadlineNoteFor = (
  hasDoc: boolean,
  deadline: Date | null,
  now: number = Date.now(),
): { text: string; type: "warning" | "danger" } | null => {
  if (hasDoc || !deadline) return null;
  const sisa = deadline.getTime() - now;
  if (sisa < 0) return { text: "Melewati Deadline", type: "danger" };
  if (sisa <= 3 * DAY_MS) {
    const hari = Math.ceil(sisa / DAY_MS);
    return { text: hari <= 1 ? "Deadline hari ini" : `Deadline ${hari} hari lagi`, type: "warning" };
  }
  return null;
};
