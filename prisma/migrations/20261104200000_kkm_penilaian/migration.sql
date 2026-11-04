CREATE TABLE IF NOT EXISTS "KkmPenilaian" (
    "id" SERIAL NOT NULL,
    "peserta_id" INTEGER NOT NULL,
    "kehadiran" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keaktifan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logbook" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "program_kerja" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laporan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sikap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nilai_akhir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grade" VARCHAR(2) NOT NULL DEFAULT 'E',
    "catatan_dpl" TEXT,
    "is_saved" BOOLEAN NOT NULL DEFAULT false,
    "dinilai_oleh" INTEGER,
    "dinilai_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KkmPenilaian_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KkmPenilaian_peserta_id_key" ON "KkmPenilaian"("peserta_id");
CREATE INDEX IF NOT EXISTS "KkmPenilaian_peserta_id_idx" ON "KkmPenilaian"("peserta_id");
CREATE INDEX IF NOT EXISTS "KkmPenilaian_dinilai_oleh_idx" ON "KkmPenilaian"("dinilai_oleh");

DO $$ BEGIN
    ALTER TABLE "KkmPenilaian" ADD CONSTRAINT "KkmPenilaian_peserta_id_fkey" FOREIGN KEY ("peserta_id") REFERENCES "KkmPeserta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "KkmPenilaian" ADD CONSTRAINT "KkmPenilaian_dinilai_oleh_fkey" FOREIGN KEY ("dinilai_oleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;