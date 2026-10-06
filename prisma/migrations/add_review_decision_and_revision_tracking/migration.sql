-- AlterEnum
ALTER TYPE "ProposalStatus" ADD VALUE 'REVISION_PENDING';

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'REVISION_MINOR', 'REVISION_MAJOR');

-- AlterTable
ALTER TABLE "ProposalReviews" 
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "decision" "ReviewDecision",
ADD COLUMN "revision_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "revision_deadline" TIMESTAMP(3),
ADD COLUMN "last_revision_submitted_at" TIMESTAMP(3);
