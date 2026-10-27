-- Guard integritas: hanya SATU periode KKM yang boleh berstatus 'AKTIF'.
-- Memperkuat guard aplikasi (enforceSingleActive pada create/activate) agar
-- anomali periode AKTIF ganda tidak mungkin terjadi — termasuk lewat
-- tulis-langsung ke DB (skrip uji/manual) yang melewati alur API.
-- Catatan: index parsial ini tidak bisa diekspresikan di schema.prisma,
-- sehingga hidup di migrasi ini saja (pola migrasi manual repo ini).
CREATE UNIQUE INDEX IF NOT EXISTS "KkmPeriod_single_aktif_key"
    ON "KkmPeriod" ("status") WHERE "status" = 'AKTIF';
