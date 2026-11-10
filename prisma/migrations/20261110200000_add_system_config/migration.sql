-- System Config — key/value konfigurasi sistem (kredensial OAuth Google).
-- Idempotent — aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "system_config" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);
