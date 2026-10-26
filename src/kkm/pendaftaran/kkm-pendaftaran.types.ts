export const UKURAN_JAKET = ["S", "M", "L", "XL", "XXL", "XXXL"] as const;

export type UkuranJaket = (typeof UKURAN_JAKET)[number];

/** Syarat pendaftaran KKM mandiri — hanya mahasiswa semester ini. */
export const SYARAT_SEMESTER = 7;

/** Tipe berkas bukti pembayaran UKT yang diterima. */
export const ALLOWED_UKT_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
