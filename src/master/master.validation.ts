import { z } from "zod";

/**
 * Validasi untuk kelola master data fakultas & program studi
 * (khusus role ADMIN_SISTEM — lihat master.routes.ts).
 */
const namaMasterSchema = z
  .string()
  .trim()
  .min(3, "Nama minimal 3 karakter.")
  .max(100, "Nama maksimal 100 karakter.");

export const createFakultasSchema = z.object({ nama: namaMasterSchema });

export const updateFakultasSchema = z.object({ nama: namaMasterSchema });

export const createProgramStudiSchema = z.object({ nama: namaMasterSchema });

export const updateProgramStudiSchema = z.object({ nama: namaMasterSchema });

export type CreateFakultasInput = z.infer<typeof createFakultasSchema>;
export type UpdateFakultasInput = z.infer<typeof updateFakultasSchema>;
export type CreateProgramStudiInput = z.infer<typeof createProgramStudiSchema>;
export type UpdateProgramStudiInput = z.infer<typeof updateProgramStudiSchema>;
