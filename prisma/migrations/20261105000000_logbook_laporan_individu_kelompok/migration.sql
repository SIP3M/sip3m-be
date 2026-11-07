-- ============================================================
-- Logbook & Laporan (Individu / Kelompok) — KKM
-- - Jabatan kelompok (KETUA/SEKRETARIS/ANGGOTA) di KkmPeserta
-- - Pengaturan deadline dinamis di KkmPeriod
-- - Tabel baru: KkmLogbookKelompok (riwayat mingguan) & KkmLaporanIndividu
-- Versi idempoten: aman dijalankan berulang.
-- ============================================================

-- 1) Enum jabatan kelompok
DO $$ BEGIN
    CREATE TYPE "JabatanKelompok" AS ENUM ('ANGGOTA', 'KETUA', 'SEKRETARIS');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2) Kolom jabatan pada KkmPeserta (default ANGgota = data lama tetap anggota)
DO $$ BEGIN
    ALTER TABLE "KkmPeserta" ADD COLUMN "jabatan" "JabatanKelompok" NOT NULL DEFAULT 'ANGGOTA';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- 3) Pengaturan deadline dinamis pada KkmPeriod
DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "deadline_logbook_individu" DATE;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "jam_logbook_individu" VARCHAR(5);
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "logbook_kelompok_hari" INTEGER;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "logbook_kelompok_jam" VARCHAR(5);
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "deadline_laporan_individu" DATE;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "jam_laporan_individu" VARCHAR(5);
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmPeriod" ADD COLUMN "jam_laporan_kelompok" VARCHAR(5);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- 4) Tabel Logbook Kelompok (1 baris = 1 minggu, riwayat)
CREATE TABLE IF NOT EXISTS "KkmLogbookKelompok" (
    "id"          SERIAL NOT NULL,
    "kelompok_id" INTEGER NOT NULL,
    "periode_id"  INTEGER NOT NULL,
    "minggu_ke"   INTEGER NOT NULL,
    "file_path"   VARCHAR(500) NOT NULL,
    "file_size"   INTEGER,
    "mime_type"   VARCHAR(100),
    "uploaded_by" INTEGER NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KkmLogbookKelompok_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KkmLogbookKelompok_kelompok_id_minggu_ke_key"
    ON "KkmLogbookKelompok"("kelompok_id", "minggu_ke");
CREATE INDEX IF NOT EXISTS "KkmLogbookKelompok_kelompok_id_idx"
    ON "KkmLogbookKelompok"("kelompok_id");
CREATE INDEX IF NOT EXISTS "KkmLogbookKelompok_periode_id_idx"
    ON "KkmLogbookKelompok"("periode_id");
CREATE INDEX IF NOT EXISTS "KkmLogbookKelompok_uploaded_by_idx"
    ON "KkmLogbookKelompok"("uploaded_by");

DO $$ BEGIN
    ALTER TABLE "KkmLogbookKelompok" ADD CONSTRAINT "KkmLogbookKelompok_kelompok_id_fkey"
        FOREIGN KEY ("kelompok_id") REFERENCES "KkmKelompok"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmLogbookKelompok" ADD CONSTRAINT "KkmLogbookKelompok_periode_id_fkey"
        FOREIGN KEY ("periode_id") REFERENCES "KkmPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmLogbookKelompok" ADD CONSTRAINT "KkmLogbookKelompok_uploaded_by_fkey"
        FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5) Tabel Laporan Individu (1 baris per mahasiswa)
CREATE TABLE IF NOT EXISTS "KkmLaporanIndividu" (
    "id"          SERIAL NOT NULL,
    "peserta_id"  INTEGER NOT NULL,
    "periode_id"  INTEGER NOT NULL,
    "file_path"   VARCHAR(500) NOT NULL,
    "file_size"   INTEGER,
    "mime_type"   VARCHAR(100),
    "uploaded_by" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KkmLaporanIndividu_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KkmLaporanIndividu_peserta_id_key"
    ON "KkmLaporanIndividu"("peserta_id");
CREATE INDEX IF NOT EXISTS "KkmLaporanIndividu_peserta_id_idx"
    ON "KkmLaporanIndividu"("peserta_id");
CREATE INDEX IF NOT EXISTS "KkmLaporanIndividu_periode_id_idx"
    ON "KkmLaporanIndividu"("periode_id");
CREATE INDEX IF NOT EXISTS "KkmLaporanIndividu_uploaded_by_idx"
    ON "KkmLaporanIndividu"("uploaded_by");

DO $$ BEGIN
    ALTER TABLE "KkmLaporanIndividu" ADD CONSTRAINT "KkmLaporanIndividu_peserta_id_fkey"
        FOREIGN KEY ("peserta_id") REFERENCES "KkmPeserta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmLaporanIndividu" ADD CONSTRAINT "KkmLaporanIndividu_periode_id_fkey"
        FOREIGN KEY ("periode_id") REFERENCES "KkmPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "KkmLaporanIndividu" ADD CONSTRAINT "KkmLaporanIndividu_uploaded_by_fkey"
        FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
