/** Centang audiens di form buat pengumuman (union antar pilihan). */
export const PENGUMUMAN_TARGET_TYPES = [
  "PESERTA",
  "DPL",
  "KELOMPOK",
  "DESA",
  "PERIODE",
  "FAKULTAS",
] as const;

export type PengumumanTargetType = (typeof PENGUMUMAN_TARGET_TYPES)[number];

/** Target yang wajib menyertakan ref_id (id kelompok/lokasi/periode/fakultas). */
export const TARGET_WITH_REF: readonly PengumumanTargetType[] = [
  "KELOMPOK",
  "DESA",
  "PERIODE",
  "FAKULTAS",
];

/** Label dasar per jenis target (dilengkapi nama referensi saat resolve). */
export const TARGET_BASE_LABEL: Record<PengumumanTargetType, string> = {
  PESERTA: "Semua Peserta KKM",
  DPL: "Semua DPL",
  KELOMPOK: "Kelompok",
  DESA: "Desa",
  PERIODE: "Periode",
  FAKULTAS: "Fakultas",
};

export const PENGUMUMAN_PRIORITAS = ["PENTING", "SEDANG", "INFORMASI"] as const;
export type PengumumanPrioritas = (typeof PENGUMUMAN_PRIORITAS)[number];

export const PENGUMUMAN_STATUS = ["SCHEDULED", "PUBLISHED"] as const;
export type PengumumanStatusValue = (typeof PENGUMUMAN_STATUS)[number];

/** Jenis di master referensi yang jadi dropdown kategori pengumuman. */
export const JENIS_KATEGORI_PENGUMUMAN = "KATEGORI_PENGUMUMAN";

/** Lampiran: PDF / JPG / PNG / DOCX, maksimal 10 MB (sesuai desain form). */
export const LAMPIRAN_MAX_BYTES = 10 * 1024 * 1024;

export const LAMPIRAN_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const LAMPIRAN_MIME_ERROR =
  "Lampiran harus berformat PDF, JPG, PNG, atau DOCX.";

/** Jumlah penerima "dibaca X/Y" per halaman daftar admin. */
export const READER_LIST_LIMIT = 100;
