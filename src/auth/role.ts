export const ROLES = {
  ADMIN_LPPM: "ADMIN_LPPM",
  STAFF_LPPM: "STAFF_LPPM",
  DOSEN: "DOSEN",
  REVIEWER: "REVIEWER",
  PIHAK_EKSTERNAL: "PIHAK EKSTERNAL",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
