-- Persetujuan anggaran oleh KETUA_LPPM + detail pencairan oleh role KEUANGAN
ALTER TABLE "PengabdianProjects"
  ADD COLUMN "disbursement_approved_at" TIMESTAMP(3),
  ADD COLUMN "disbursement_approved_by" INTEGER,
  ADD COLUMN "disbursed_by" INTEGER,
  ADD COLUMN "disbursement_note" TEXT,
  ADD COLUMN "transfer_proof_path" VARCHAR(500),
  ADD COLUMN "transfer_proof_url" VARCHAR(1000);

ALTER TABLE "PengabdianProjects"
  ADD CONSTRAINT "PengabdianProjects_disbursement_approved_by_fkey"
  FOREIGN KEY ("disbursement_approved_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PengabdianProjects"
  ADD CONSTRAINT "PengabdianProjects_disbursed_by_fkey"
  FOREIGN KEY ("disbursed_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
