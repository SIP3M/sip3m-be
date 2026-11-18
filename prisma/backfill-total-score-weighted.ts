/**
 * Backfill total_score ProposalReviews → rata-rata terbobot (skala 0–100).
 *
 * Sebelumnya total_score disimpan sebagai jumlah mentah 5 skor (0–500),
 * padahal form reviewer menampilkan "Nilai Akhir (Rata-rata Terbobot)"
 * dengan bobot perumusan 20%, tinjauan 20%, metode 25%, anggaran 15%,
 * luaran 20% (skala 0–100).
 *
 * Skrip ini menghitung ulang semua baris yang memiliki kelima skor lengkap.
 * Aman dijalankan berulang (idempoten) — nilai hasil selalu sama.
 *
 * Jalankan: npx ts-node -r dotenv/config prisma/backfill-total-score-weighted.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const weightedTotal = (s: {
  score_perumusan: number;
  score_tinjauan: number;
  score_metode: number;
  score_anggaran: number;
  score_luaran: number;
}): number =>
  Number(
    (
      s.score_perumusan * 0.2 +
      s.score_tinjauan * 0.2 +
      s.score_metode * 0.25 +
      s.score_anggaran * 0.15 +
      s.score_luaran * 0.2
    ).toFixed(1),
  );

const main = async () => {
  const rows = await prisma.proposalReviews.findMany({
    select: {
      id: true,
      proposal_id: true,
      score_perumusan: true,
      score_tinjauan: true,
      score_metode: true,
      score_anggaran: true,
      score_luaran: true,
      total_score: true,
    },
    orderBy: { id: "asc" },
  });

  const lengkap = rows.filter(
    (r) =>
      r.score_perumusan !== null &&
      r.score_tinjauan !== null &&
      r.score_metode !== null &&
      r.score_anggaran !== null &&
      r.score_luaran !== null,
  );

  console.log(`Total baris review      : ${rows.length}`);
  console.log(`Kelima skor lengkap     : ${lengkap.length}`);
  console.log(`Contoh sebelum backfill :`);
  for (const r of lengkap.slice(0, 5)) {
    console.log(
      `  id=${r.id} proposal=${r.proposal_id} skor=[${r.score_perumusan},${r.score_tinjauan},${r.score_metode},${r.score_anggaran},${r.score_luaran}] total=${r.total_score}`,
    );
  }

  let diubah = 0;
  for (const r of lengkap) {
    const baru = weightedTotal({
      score_perumusan: r.score_perumusan!,
      score_tinjauan: r.score_tinjauan!,
      score_metode: r.score_metode!,
      score_anggaran: r.score_anggaran!,
      score_luaran: r.score_luaran!,
    });
    if (baru !== r.total_score) {
      await prisma.proposalReviews.update({
        where: { id: r.id },
        data: { total_score: baru },
      });
      diubah++;
    }
  }

  const sesudah = await prisma.proposalReviews.findMany({
    where: { id: { in: lengkap.map((r) => r.id) } },
    select: { id: true, proposal_id: true, total_score: true },
    orderBy: { id: "asc" },
  });

  console.log(`\nBaris diubah           : ${diubah}`);
  console.log(`Contoh sesudah backfill :`);
  for (const r of sesudah.slice(0, 5)) {
    console.log(`  id=${r.id} proposal=${r.proposal_id} total=${r.total_score}`);
  }
  const nilai = sesudah.map((r) => r.total_score).filter((v): v is number => v !== null);
  if (nilai.length > 0) {
    console.log(
      `Rentang nilai akhir     : ${Math.min(...nilai)} – ${Math.max(...nilai)}`,
    );
  }
};

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
