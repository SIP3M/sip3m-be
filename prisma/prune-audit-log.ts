/**
 * Prune Audit Log — hapus baris yang lebih tua dari RETENTION_MONTHS (12 bulan).
 *
 * Jalankan terjadwal (Vercel cron / CI / manual bulanan):
 *   npm run audit:prune
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const RETENTION_MONTHS = 12;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

  const { count } = await prisma.auditLog.deleteMany({
    where: { created_at: { lt: cutoff } },
  });

  console.log(
    `[audit-prune] menghapus ${count} baris audit log lebih tua dari ${cutoff.toISOString()}`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[audit-prune] gagal:", err);
  process.exit(1);
});
