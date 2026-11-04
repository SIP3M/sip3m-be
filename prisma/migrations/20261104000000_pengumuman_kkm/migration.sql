-- Pengumuman KKM — broadcast ke notifikasi penerima + statistik "dibaca X/Y"
CREATE TYPE "PengumumanStatus" AS ENUM ('SCHEDULED', 'PUBLISHED');
CREATE TYPE "PengumumanPrioritas" AS ENUM ('PENTING', 'SEDANG', 'INFORMASI');
CREATE TYPE "PengumumanTargetType" AS ENUM ('PESERTA', 'DPL', 'KELOMPOK', 'DESA', 'PERIODE', 'FAKULTAS');

CREATE TABLE "Pengumuman" (
    "id" SERIAL NOT NULL,
    "judul" VARCHAR(255) NOT NULL,
    "isi" TEXT NOT NULL,
    "kategori" VARCHAR(100) NOT NULL,
    "prioritas" "PengumumanPrioritas" NOT NULL DEFAULT 'SEDANG',
    "status" "PengumumanStatus" NOT NULL DEFAULT 'SCHEDULED',
    "published_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "lampiran_path" VARCHAR(500),
    "lampiran_name" VARCHAR(255),
    "lampiran_size" INTEGER,
    "lampiran_mime" VARCHAR(100),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pengumuman_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PengumumanTarget" (
    "id" SERIAL NOT NULL,
    "pengumuman_id" INTEGER NOT NULL,
    "target_type" "PengumumanTargetType" NOT NULL,
    "ref_id" INTEGER,

    CONSTRAINT "PengumumanTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PengumumanRecipient" (
    "id" SERIAL NOT NULL,
    "pengumuman_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "PengumumanRecipient_pkey" PRIMARY KEY ("id")
);

-- Kolom penghubung notifikasi -> pengumuman (nullable, aman untuk data lama)
ALTER TABLE "Notifications" ADD COLUMN "pengumuman_id" INTEGER;

-- Foreign Keys
ALTER TABLE "Pengumuman" ADD CONSTRAINT "Pengumuman_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PengumumanTarget" ADD CONSTRAINT "PengumumanTarget_pengumuman_id_fkey"
    FOREIGN KEY ("pengumuman_id") REFERENCES "Pengumuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PengumumanRecipient" ADD CONSTRAINT "PengumumanRecipient_pengumuman_id_fkey"
    FOREIGN KEY ("pengumuman_id") REFERENCES "Pengumuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PengumumanRecipient" ADD CONSTRAINT "PengumumanRecipient_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_pengumuman_id_fkey"
    FOREIGN KEY ("pengumuman_id") REFERENCES "Pengumuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes (sesuai schema Prisma)
CREATE INDEX "Pengumuman_status_idx" ON "Pengumuman"("status");
CREATE INDEX "Pengumuman_published_at_idx" ON "Pengumuman"("published_at");
CREATE INDEX "Pengumuman_created_at_idx" ON "Pengumuman"("created_at");
CREATE INDEX "Pengumuman_is_pinned_idx" ON "Pengumuman"("is_pinned");
CREATE UNIQUE INDEX "PengumumanTarget_pengumuman_id_target_type_ref_id_key"
    ON "PengumumanTarget"("pengumuman_id", "target_type", "ref_id");
CREATE INDEX "PengumumanTarget_target_type_ref_id_idx" ON "PengumumanTarget"("target_type", "ref_id");
CREATE UNIQUE INDEX "PengumumanRecipient_pengumuman_id_user_id_key"
    ON "PengumumanRecipient"("pengumuman_id", "user_id");
CREATE INDEX "PengumumanRecipient_user_id_idx" ON "PengumumanRecipient"("user_id");
CREATE INDEX "Notifications_pengumuman_id_idx" ON "Notifications"("pengumuman_id");

-- Seed kategori pengumuman (master dinamis, dikelola ADMIN_SISTEM)
INSERT INTO "MasterReferensi" ("jenis", "nama", "urut") VALUES
    ('KATEGORI_PENGUMUMAN', 'Pembekalan', 1),
    ('KATEGORI_PENGUMUMAN', 'Lokasi KKM', 2),
    ('KATEGORI_PENGUMUMAN', 'Penempatan', 3),
    ('KATEGORI_PENGUMUMAN', 'Deadline', 4),
    ('KATEGORI_PENGUMUMAN', 'Monitoring', 5),
    ('KATEGORI_PENGUMUMAN', 'Revisi', 6),
    ('KATEGORI_PENGUMUMAN', 'Jadwal', 7)
ON CONFLICT ("jenis", "nama") DO NOTHING;
