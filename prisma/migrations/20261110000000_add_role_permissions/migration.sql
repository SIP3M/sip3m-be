-- Role & Permission dinamis.
-- Idempotent — aman dijalankan berulang.

ALTER TABLE "roles"
  ADD COLUMN IF NOT EXISTS "deskripsi" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dashboard_path" VARCHAR(100);

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" SERIAL NOT NULL,
    "kode" VARCHAR(100) NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "grup" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_kode_key" ON "permissions"("kode");

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_id_permission_id_key"
  ON "role_permissions"("role_id", "permission_id");

ALTER TABLE "role_permissions"
  DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey",
  ADD CONSTRAINT "role_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
  DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey",
  ADD CONSTRAINT "role_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
