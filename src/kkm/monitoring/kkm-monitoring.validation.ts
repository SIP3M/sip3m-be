import { z } from "zod";

export const MonitoringStatusFilter = z.enum([
  "AKTIF",
  "PERLU_PERHATIAN",
  "BERMASALAH",
  "SELESAI",
]);

// Query list monitoring: periode opsional (default periode AKTIF)
export const kkmMonitoringQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  search: z.string().trim().optional(),
  status: MonitoringStatusFilter.optional(),
  desa: z.string().trim().optional(),
  dpl_id: z.coerce.number().int().positive().optional(),
});

// Tambah entri logbook (mahasiswa anggota / DPL)
export const kkmLogbookCreateSchema = z.object({
  tanggal: z
    .string()
    .trim()
    .min(1, "tanggal wajib diisi.")
    .refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "tanggal harus format ISO (YYYY-MM-DD).",
    }),
  judul: z.string().trim().min(3, "judul minimal 3 karakter.").max(255),
  deskripsi: z.string().trim().min(3, "deskripsi minimal 3 karakter."),
  lokasi_kegiatan: z.string().trim().max(255).optional(),
});

// Review logbook (DPL kelompok / admin LPPM): APPROVED atau REVISI
export const kkmLogbookReviewSchema = z
  .object({
    status: z.enum(["APPROVED", "REVISI"]),
    catatan: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.status !== "REVISI" || (v.catatan && v.catatan.length >= 3), {
    message: "catatan wajib diisi minimal 3 karakter saat status REVISI.",
    path: ["catatan"],
  });

// Tandai monitoring oleh DPL (catatan opsional)
export const kkmMonitoringMarkSchema = z.object({
  catatan: z.string().trim().max(500).optional(),
});

export type KkmMonitoringQuery = z.infer<typeof kkmMonitoringQuerySchema>;
export type KkmLogbookCreateInput = z.infer<typeof kkmLogbookCreateSchema>;
export type KkmLogbookReviewInput = z.infer<typeof kkmLogbookReviewSchema>;
export type KkmMonitoringMarkInput = z.infer<typeof kkmMonitoringMarkSchema>;
