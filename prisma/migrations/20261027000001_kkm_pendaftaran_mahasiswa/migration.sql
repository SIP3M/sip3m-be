-- Pendaftaran KKM mandiri (mahasiswa): kolom formulir + status DRAFT
ALTER TYPE "KkmPesertaStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

ALTER TABLE "KkmPeserta"
    ADD COLUMN "no_wa" VARCHAR(20),
    ADD COLUMN "ukuran_jaket" VARCHAR(10),
    ADD COLUMN "nama_kontak_darurat" VARCHAR(100),
    ADD COLUMN "no_hp_kontak_darurat" VARCHAR(20),
    ADD COLUMN "alamat_domisili" TEXT,
    ADD COLUMN "bukti_ukt_path" VARCHAR(255);
