-- ============================================================
-- Grant RBAC untuk role REVIEWER_ADMINISTRASI
--
-- Idempoten & TERARAH: hanya menambah permission baru, role baru, dan grant
-- yang dibutuhkan. TIDAK menghapus grant role lain — berbeda dengan
-- `prisma/seed-permissions.ts` yang me-replace seluruh grant role bawaan.
--
-- Jalankan: npx prisma db execute --file prisma/seed-reviewer-administrasi.sql --url "$DIRECT_URL"
-- ============================================================

-- 1) Permission baru
INSERT INTO "permissions" ("kode", "nama", "grup")
VALUES
  ('proposal.verifikasi-administrasi', 'Verifikasi Administrasi Proposal', 'Penelitian'),
  ('kkm.peserta.verifikasi', 'Verifikasi Pendaftaran Peserta KKM', 'KKM: Peserta & Kelompok')
ON CONFLICT ("kode") DO UPDATE
SET "nama" = EXCLUDED."nama", "grup" = EXCLUDED."grup";

-- 2) Role REVIEWER_ADMINISTRASI + dashboard tujuan login
INSERT INTO "roles" ("roles", "deskripsi", "dashboard_path")
VALUES (
  'REVIEWER_ADMINISTRASI',
  'Gerbang verifikasi administrasi: memeriksa kelengkapan berkas proposal dan pendaftaran peserta KKM.',
  '/reviewer-administrasi-dashboard'
)
ON CONFLICT ("roles") DO UPDATE
SET "deskripsi" = EXCLUDED."deskripsi",
    "dashboard_path" = EXCLUDED."dashboard_path";

-- 3) Grant untuk REVIEWER_ADMINISTRASI
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."roles" = 'REVIEWER_ADMINISTRASI'
  AND p."kode" IN (
    'proposal.lihat',
    'proposal.lihat-detail',
    'proposal.verifikasi-administrasi',
    'kkm.peserta.lihat',
    'kkm.peserta.verifikasi'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- 4) Override Ketua LPPM (boleh memutuskan & menarik verifikasi)
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."roles" = 'KETUA_LPPM'
  AND p."kode" IN ('proposal.verifikasi-administrasi', 'kkm.peserta.verifikasi')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
