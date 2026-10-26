-- Master Referensi — skema penelitian & sumber pendanaan dinamis (ADMIN_SISTEM)
CREATE TABLE "MasterReferensi" (
    "id" SERIAL NOT NULL,
    "jenis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "urut" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterReferensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterReferensi_jenis_nama_key" ON "MasterReferensi"("jenis", "nama");

-- CreateIndex
CREATE INDEX "MasterReferensi_jenis_is_aktif_idx" ON "MasterReferensi"("jenis", "is_aktif");

-- Seed: nilai enum lama (DB menyimpan label karena @map)
INSERT INTO "MasterReferensi" ("jenis", "nama", "urut") VALUES
    ('SKEMA', 'Penelitian Pengembangan', 1),
    ('SKEMA', 'Penelitian Terapan', 2),
    ('SKEMA', 'Penelitian Kolaborasi', 3),
    ('SUMBER_PENDANAAN', 'Internal Kampus', 1),
    ('SUMBER_PENDANAAN', 'Kemendikbudristek', 2),
    ('SUMBER_PENDANAAN', 'Mandiri', 3),
    ('SUMBER_PENDANAAN', 'Lainnya', 4);

-- Konversi kolom enum -> text (nilai enum = label persis, data aman)
ALTER TABLE "proposals" ALTER COLUMN "skema" TYPE TEXT USING "skema"::text;
ALTER TABLE "proposals" ALTER COLUMN "sumber_pendanaan" TYPE TEXT USING "sumber_pendanaan"::text;

-- Drop type lama
DROP TYPE "SumberPendanaan";
DROP TYPE "SkemaProposal";
