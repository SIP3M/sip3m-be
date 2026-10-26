-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "user_name" TEXT,
    "user_role" TEXT,
    "modul" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "objek" TEXT NOT NULL,
    "objek_id" TEXT,
    "ip" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_modul_idx" ON "AuditLog"("modul");

-- CreateIndex
CREATE INDEX "AuditLog_aksi_idx" ON "AuditLog"("aksi");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");
