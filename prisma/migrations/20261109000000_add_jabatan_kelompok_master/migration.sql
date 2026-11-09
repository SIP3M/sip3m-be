-- CreateTable JabatanKelompokMaster
CREATE TABLE "JabatanKelompokMaster" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "max_per_kelompok" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JabatanKelompokMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JabatanKelompokMaster_nama_key" ON "JabatanKelompokMaster"("nama");

-- AlterTable KkmPeserta: add jabatan_id column
ALTER TABLE "KkmPeserta" ADD COLUMN "jabatan_id" INTEGER;

-- AddForeignKey
ALTER TABLE "KkmPeserta" ADD CONSTRAINT "KkmPeserta_jabatan_id_fkey" FOREIGN KEY ("jabatan_id") REFERENCES "JabatanKelompokMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default jabatan values (ANGGOTA, KETUA, SEKRETARIS, BENDAHARA etc)
INSERT INTO "JabatanKelompokMaster" (nama, max_per_kelompok, updated_at) VALUES
  ('ANGGOTA', NULL, CURRENT_TIMESTAMP),
  ('KETUA', 1, CURRENT_TIMESTAMP),
  ('SEKRETARIS', 1, CURRENT_TIMESTAMP)
ON CONFLICT (nama) DO NOTHING;
