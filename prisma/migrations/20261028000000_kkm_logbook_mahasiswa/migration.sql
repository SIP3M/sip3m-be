-- Logbook KKM mahasiswa: status review + file logbook PDF (opsional)
CREATE TYPE "KkmLogbookStatus" AS ENUM ('PENDING', 'APPROVED', 'REVISI');

ALTER TABLE "KkmLogbookEntry"
    ADD COLUMN "status" "KkmLogbookStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "file_path" VARCHAR(500),
    ADD COLUMN "file_size" INTEGER,
    ADD COLUMN "catatan_revisi" VARCHAR(500),
    ADD COLUMN "reviewed_by" INTEGER,
    ADD COLUMN "reviewed_at" TIMESTAMP(3);

ALTER TABLE "KkmLogbookEntry"
    ADD CONSTRAINT "KkmLogbookEntry_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "KkmLogbookEntry_status_idx" ON "KkmLogbookEntry"("status");
