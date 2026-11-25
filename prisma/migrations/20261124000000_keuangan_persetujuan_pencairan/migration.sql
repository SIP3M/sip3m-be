-- Persetujuan anggaran oleh KETUA_LPPM + detail pencairan oleh role KEUANGAN
-- Idempoten: aman dijalankan ulang bila sebelumnya terputus di tengah.
ALTER TABLE "PengabdianProjects"
  ADD COLUMN IF NOT EXISTS "disbursement_approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "disbursement_approved_by" INTEGER,
  ADD COLUMN IF NOT EXISTS "disbursed_by" INTEGER,
  ADD COLUMN IF NOT EXISTS "disbursement_note" TEXT,
  ADD COLUMN IF NOT EXISTS "transfer_proof_path" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "transfer_proof_url" VARCHAR(1000);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PengabdianProjects_disbursement_approved_by_fkey'
  ) THEN
    ALTER TABLE "PengabdianProjects"
      ADD CONSTRAINT "PengabdianProjects_disbursement_approved_by_fkey"
      FOREIGN KEY ("disbursement_approved_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PengabdianProjects_disbursed_by_fkey'
  ) THEN
    ALTER TABLE "PengabdianProjects"
      ADD CONSTRAINT "PengabdianProjects_disbursed_by_fkey"
      FOREIGN KEY ("disbursed_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
