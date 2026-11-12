import { z } from "zod";
import { KkmKelompokDocumentType } from "../../generated/prisma/enums";

// Jenis laporan kelompok yang direview (dokumen PROPOSAL/LOGBOOK tidak masuk).
export const JENIS_LAPORAN_VALUES = [
  KkmKelompokDocumentType.LAPORAN_AWAL,
  KkmKelompokDocumentType.LAPORAN_MINGGUAN,
  KkmKelompokDocumentType.LAPORAN_AKHIR,
] as const;

// Field jenis laporan — hanya 3 jenis laporan (bukan PROPOSAL/LOGBOOK).
const jenisLaporanField = z.enum(JENIS_LAPORAN_VALUES, {
  message: "Jenis laporan tidak valid. Pilihan: Laporan Awal, Mingguan, Akhir.",
});

// Status turunan per baris laporan (dihitung BE, bukan kolom mentah).
export const StatusLaporanFilter = z.enum([
  "BELUM_UPLOAD",
  "MENUNGGU_REVIEW",
  "DISETUJUI",
  "REVISI",
  "TERLAMBAT",
]);

// Query daftar laporan (admin/staff; DPL otomatis dibatasi kelompok bimbingan)
export const kkmLaporanQuerySchema = z.object({
  periode_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  search: z.string().trim().optional(),
  status: StatusLaporanFilter.optional(),
  jenis: jenisLaporanField.optional(),
  desa: z.string().trim().optional(),
  dpl_id: z.coerce.number().int().positive().optional(),
});

// Detail satu baris: kelompok + jenis laporan (composite key)
export const kkmLaporanDetailQuerySchema = z.object({
  kelompok_id: z.coerce.number().int().positive("ID kelompok tidak valid."),
  jenis: jenisLaporanField,
});

// Review laporan: DISETUJUI / REVISI (catatan wajib saat REVISI)
export const kkmLaporanReviewSchema = z
  .object({
    kelompok_id: z.coerce.number().int().positive("ID kelompok tidak valid."),
    jenis: jenisLaporanField,
    status: z.enum(["DISETUJUI", "REVISI"], {
      message: "Status review tidak valid. Pilihan: DISETUJUI, REVISI.",
    }),
    catatan: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.status !== "REVISI" || (v.catatan && v.catatan.length >= 3), {
    message: "catatan wajib diisi minimal 3 karakter saat status REVISI.",
    path: ["catatan"],
  });

// Setujui massal (maks 200 baris per aksi)
export const kkmLaporanBulkSchema = z.object({
  items: z
    .array(
      z.object({
        kelompok_id: z.coerce.number().int().positive(),
        jenis: jenisLaporanField,
      }),
    )
    .min(1, "Pilih minimal satu laporan.")
    .max(200, "Maksimal 200 laporan per aksi."),
});

export type KkmLaporanQuery = z.infer<typeof kkmLaporanQuerySchema>;
export type KkmLaporanDetailQuery = z.infer<typeof kkmLaporanDetailQuerySchema>;
export type KkmLaporanReviewInput = z.infer<typeof kkmLaporanReviewSchema>;
export type KkmLaporanBulkInput = z.infer<typeof kkmLaporanBulkSchema>;
