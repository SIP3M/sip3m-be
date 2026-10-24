-- Role ADMIN_SISTEM: pengelola master data fakultas & program studi.
-- Idempotent (ON CONFLICT DO NOTHING) — aman dijalankan berulang.
INSERT INTO "roles" ("roles")
VALUES ('ADMIN_SISTEM')
ON CONFLICT ("roles") DO NOTHING;
