import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const PERIODE_ID = 30;
  const TOTAL_KELOMPOK = 20;

  console.log(`Seed ${TOTAL_KELOMPOK} kelompok untuk periode ${PERIODE_ID}...`);

  // Ambil 20 lokasi (desa) yang sudah ada
  const lokasi = await prisma.kkmLocation.findMany({
    where: { periode_id: PERIODE_ID },
    orderBy: { id: "asc" },
    take: TOTAL_KELOMPOK,
  });

  if (lokasi.length < TOTAL_KELOMPOK) {
    throw new Error(
      `Lokasi tidak cukup. Ada ${lokasi.length}, butuh ${TOTAL_KELOMPOK}`,
    );
  }

  let created = 0;

  for (let i = 0; i < TOTAL_KELOMPOK; i++) {
    const kelompok_name = `Kelompok Testing ${i + 1}`;
    const lokasi_id = lokasi[i].id;

    try {
      const result = await prisma.kkmKelompok.create({
        data: {
          periode_id: PERIODE_ID,
          lokasi_id: lokasi_id,
          nama: kelompok_name,
          dpl_id: null, // Bisa diisi nanti via admin
        },
      });
      console.log(`✓ ${kelompok_name} (id=${result.id}, lokasi_id=${lokasi_id})`);
      created++;
    } catch (err) {
      console.error(`✗ ${kelompok_name}:`, err);
    }
  }

  console.log(`\nTotal kelompok dibuat: ${created}/${TOTAL_KELOMPOK}`);
}

main().finally(() => prisma.$disconnect());
