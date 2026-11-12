-- Fitur Laporan KKM (review per jenis laporan kelompok)
-- 1) Jenis dokumen laporan: Awal & Mingguan (Akhir sudah ada)
ALTER TYPE "KkmKelompokDocumentType" ADD VALUE IF NOT EXISTS 'LAPORAN_AWAL';
ALTER TYPE "KkmKelompokDocumentType" ADD VALUE IF NOT EXISTS 'LAPORAN_MINGGUAN';

-- 2) Status review laporan (default MENUNGGU_REVIEW, reset saat upload ulang)
CREATE TYPE "KkmLaporanReviewStatus" AS ENUM ('MENUNGGU_REVIEW', 'DISETUJUI', 'REVISI');

ALTER TABLE "KkmKelompokDocument" ADD COLUMN "status_review" "KkmLaporanReviewStatus" NOT NULL DEFAULT 'MENUNGGU_REVIEW';
ALTER TABLE "KkmKelompokDocument" ADD COLUMN "catatan_revisi" TEXT;
ALTER TABLE "KkmKelompokDocument" ADD COLUMN "reviewed_by" INTEGER;
ALTER TABLE "KkmKelompokDocument" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "KkmKelompokDocument" ADD CONSTRAINT "KkmKelompokDocument_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "KkmKelompokDocument_status_review_idx" ON "KkmKelompokDocument"("status_review");

-- 3) Deadline laporan kelompok per jenis di periode (Akhir tetap deadline_laporan)
ALTER TABLE "KkmPeriod" ADD COLUMN "deadline_laporan_awal" DATE;
ALTER TABLE "KkmPeriod" ADD COLUMN "jam_laporan_awal" VARCHAR(5);
ALTER TABLE "KkmPeriod" ADD COLUMN "deadline_laporan_mingguan" DATE;
ALTER TABLE "KkmPeriod" ADD COLUMN "jam_laporan_mingguan" VARCHAR(5);
