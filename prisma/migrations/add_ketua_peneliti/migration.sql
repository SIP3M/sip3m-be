-- Add ketua peneliti columns (Opsi B: Ketua dari kolom Peran)
ALTER TABLE ""proposals"" ADD COLUMN ""nama_ketua"" VARCHAR(100);
ALTER TABLE ""proposals"" ADD COLUMN ""nidn_ketua"" VARCHAR(30);
