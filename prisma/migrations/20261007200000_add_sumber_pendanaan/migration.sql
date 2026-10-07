-- CreateEnum
CREATE TYPE "SumberPendanaan" AS ENUM ('Internal Kampus', 'Kemendikbudristek', 'Mandiri', 'Lainnya');

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN "sumber_pendanaan" "SumberPendanaan";
