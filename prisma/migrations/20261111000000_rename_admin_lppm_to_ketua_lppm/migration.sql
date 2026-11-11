-- Rename role ADMIN_LPPM -> KETUA_LPPM (hanya nama kode; izin & relasi by id tetap).
-- Idempotent — aman dijalankan berulang.

UPDATE "roles" SET "roles" = 'KETUA_LPPM' WHERE "roles" = 'ADMIN_LPPM';
