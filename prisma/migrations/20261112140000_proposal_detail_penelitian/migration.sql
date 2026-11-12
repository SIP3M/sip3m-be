-- Tambah field naratif proposal (additive, nullable — data lama NULL).
-- Kewajiban isi diatur di lapisan aplikasi saat submit final.
ALTER TABLE "proposals" ADD COLUMN "tujuan_penelitian" TEXT;
ALTER TABLE "proposals" ADD COLUMN "metode_penelitian" TEXT;
ALTER TABLE "proposals" ADD COLUMN "abstrak" TEXT;
