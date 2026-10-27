-- Status baru: review reviewer selesai, menunggu keputusan akhir Admin LPPM.
-- Catatan: ALTER TYPE ... ADD VALUE tidak bisa dipakai di transaksi yang sama
-- (aturan PostgreSQL), jadi skrip ini dijalankan sendiri di luar transaksi.
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'REVIEW_DONE';
