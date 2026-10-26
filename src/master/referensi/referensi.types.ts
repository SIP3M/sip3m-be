/** Jenis opsi di master referensi. */
export const JENIS_REFERENSI = ["SKEMA", "SUMBER_PENDANAAN"] as const;

export type JenisReferensi = (typeof JENIS_REFERENSI)[number];

/** Nama modul audit untuk tiap jenis. */
export const JENIS_MODUL_LABEL: Record<JenisReferensi, string> = {
  SKEMA: "Skema Penelitian",
  SUMBER_PENDANAAN: "Sumber Pendanaan",
};
