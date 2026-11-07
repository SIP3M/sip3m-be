-- ============================================================
-- Logbook Individu dibuat MINGGUAN (mirip Logbook Kelompok)
-- - `deadline_logbook_individu` (tanggal global) dihapus
-- - `jam_logbook_individu` diganti nama menjadi `logbook_individu_jam`
-- - `logbook_individu_hari` ditambahkan (1=Senin .. 7=Minggu)
-- Jendela minggu dihitung dari tgl_pelaksanaan s/d tgl_penarikan.
-- Versi idempoten: aman dijalankan berulang.
-- ============================================================

DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "logbook_individu_hari" INTEGER;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "logbook_individu_jam" VARCHAR(5);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Bawa nilai jam lama (bila ada) ke nama kolom baru.
UPDATE "KkmPeriod"
   SET "logbook_individu_jam" = "jam_logbook_individu"
 WHERE "logbook_individu_jam" IS NULL
   AND "jam_logbook_individu" IS NOT NULL;

ALTER TABLE "KkmPeriod" DROP COLUMN IF EXISTS "deadline_logbook_individu";
ALTER TABLE "KkmPeriod" DROP COLUMN IF EXISTS "jam_logbook_individu";
