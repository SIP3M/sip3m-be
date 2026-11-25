-- ============================================================
-- Role REVIEWER_ADMINISTRASI — gate verifikasi administrasi
--
-- Idempoten: aman dijalankan berulang (dipakai lewat `prisma db execute`).
-- Berisi:
--   1) Status proposal baru ADMIN_REVISION
--   2) Enum keputusan verifikasi administrasi
--   3) Tabel riwayat verifikasi + snapshot checklist
--   4) Kolom klaim/lock verifikator pada proposals
--   5) Jejak verifikasi pendaftaran peserta KKM
--   6) Checklist kelengkapan default (MasterReferensi)
-- ============================================================

-- 1) Status proposal baru: revisi administrasi
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'ADMIN_REVISION';

-- 2) Enum keputusan verifikasi administrasi
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminVerificationDecision') THEN
    CREATE TYPE "AdminVerificationDecision" AS ENUM ('LOLOS', 'REVISI', 'TOLAK', 'TARIK_KEMBALI');
  END IF;
END $$;

-- 3) Riwayat keputusan verifikasi administrasi
CREATE TABLE IF NOT EXISTS "ProposalAdminVerifications" (
  "id" SERIAL PRIMARY KEY,
  "proposal_id" INTEGER NOT NULL,
  "verifier_id" INTEGER NOT NULL,
  "decision" "AdminVerificationDecision" NOT NULL,
  "catatan" TEXT,
  "checklist" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ProposalAdminVerifications_proposal_id_created_at_idx"
  ON "ProposalAdminVerifications" ("proposal_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "ProposalAdminVerifications_verifier_id_idx"
  ON "ProposalAdminVerifications" ("verifier_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProposalAdminVerifications_proposal_id_fkey'
  ) THEN
    ALTER TABLE "ProposalAdminVerifications"
      ADD CONSTRAINT "ProposalAdminVerifications_proposal_id_fkey"
      FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProposalAdminVerifications_verifier_id_fkey'
  ) THEN
    ALTER TABLE "ProposalAdminVerifications"
      ADD CONSTRAINT "ProposalAdminVerifications_verifier_id_fkey"
      FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Klaim/lock verifikator aktif pada proposals
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "admin_verifier_id" INTEGER;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "admin_claimed_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "proposals_admin_verifier_id_idx"
  ON "proposals" ("admin_verifier_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_admin_verifier_id_fkey'
  ) THEN
    ALTER TABLE "proposals"
      ADD CONSTRAINT "proposals_admin_verifier_id_fkey"
      FOREIGN KEY ("admin_verifier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 5) Jejak verifikasi pendaftaran peserta KKM
ALTER TABLE "KkmPeserta" ADD COLUMN IF NOT EXISTS "catatan_verifikasi" TEXT;
ALTER TABLE "KkmPeserta" ADD COLUMN IF NOT EXISTS "verified_by_id" INTEGER;
ALTER TABLE "KkmPeserta" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'KkmPeserta_verified_by_id_fkey'
  ) THEN
    ALTER TABLE "KkmPeserta"
      ADD CONSTRAINT "KkmPeserta_verified_by_id_fkey"
      FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 6) Checklist kelengkapan administrasi default (bisa diubah Admin lewat
--    Master Referensi → jenis CHECKLIST_ADMINISTRASI)
-- Catatan: updated_at tidak punya DEFAULT di tabel (diisi Prisma @updatedAt),
-- jadi wajib disebut eksplisit. Guard NOT EXISTS dipakai agar tidak bergantung
-- pada ada/tidaknya unique index (jenis, nama) di database hasil drift.
INSERT INTO "MasterReferensi" ("jenis", "nama", "is_aktif", "urut", "updated_at")
SELECT v.jenis, v.nama, TRUE, v.urut, NOW()
FROM (VALUES
  ('CHECKLIST_ADMINISTRASI', 'Dokumen proposal diunggah dan dapat dibuka', 1),
  ('CHECKLIST_ADMINISTRASI', 'RAB diunggah dan sesuai format LPPM', 2),
  ('CHECKLIST_ADMINISTRASI', 'Identitas ketua & anggota tim lengkap (NIDN/NIM)', 3),
  ('CHECKLIST_ADMINISTRASI', 'Nominal dana yang diajukan wajar dan terbaca', 4),
  ('CHECKLIST_ADMINISTRASI', 'Abstrak, tujuan, metode, dan sumber data terisi', 5)
) AS v(jenis, nama, urut)
WHERE NOT EXISTS (
  SELECT 1 FROM "MasterReferensi" m
  WHERE m."jenis" = v.jenis AND m."nama" = v.nama
);
