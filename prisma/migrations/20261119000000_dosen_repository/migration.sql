-- ============================================================
-- Repository Publikasi Dosen — tabel baru
-- - dosen_repository: daftar dosen PDDikti + angka publikasi SINTA
-- - repository_sync_state: status & kunci sinkronisasi (TTL 24 jam)
-- Versi idempoten: aman dijalankan berulang.
-- ============================================================

-- 1) Tabel dosen_repository
DO $$ BEGIN
    CREATE TABLE "dosen_repository" (
        "id" TEXT NOT NULL,
        "dedupe_key" VARCHAR(160) NOT NULL,
        "nama" VARCHAR(200) NOT NULL,
        "nidn" VARCHAR(30),
        "nuptk" VARCHAR(30),
        "prodi" VARCHAR(150),
        "jenjang" VARCHAR(20),
        "status_aktif" VARCHAR(50),
        "ikatan_kerja" VARCHAR(50),
        "pddikti_synced_at" TIMESTAMP(3),
        "sinta_id" VARCHAR(30),
        "sinta_profile_url" VARCHAR(300),
        "scopus_count" INTEGER,
        "garuda_count" INTEGER,
        "gs_count" INTEGER,
        "sinta_synced_at" TIMESTAMP(3),
        "publikasi_cache" JSONB,
        "publikasi_cached_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "dosen_repository_pkey" PRIMARY KEY ("id")
    );
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX "dosen_repository_dedupe_key_key" ON "dosen_repository"("dedupe_key");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX "dosen_repository_nama_idx" ON "dosen_repository"("nama");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 2) Tabel repository_sync_state
DO $$ BEGIN
    CREATE TABLE "repository_sync_state" (
        "key" VARCHAR(50) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'idle',
        "locked_at" TIMESTAMP(3),
        "last_sync_at" TIMESTAMP(3),
        "last_error" TEXT,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "repository_sync_state_pkey" PRIMARY KEY ("key")
    );
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 3) Baris status awal sinkronisasi
INSERT INTO "repository_sync_state" ("key", "status", "updated_at")
VALUES ('dosen_repository', 'idle', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
