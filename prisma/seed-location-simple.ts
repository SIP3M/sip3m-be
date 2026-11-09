import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const PERIODE_ID = 30;
  const KABUPATEN = "Test Kabupaten";
  const KECAMATAN = "Test Kecamatan";
  const TOTAL_DESA = 20;

  console.log(`Seed 20 desa untuk periode ${PERIODE_ID}...`);

  let created = 0;

  for (let i = 1; i <= TOTAL_DESA; i++) {
    const desa_name = `Desa Testing ${i}`;
    try {
      const result = await prisma.kkmLocation.upsert({
        where: {
          periode_id_kabupaten_kecamatan_desa: {
            periode_id: PERIODE_ID,
            kabupaten: KABUPATEN,
            kecamatan: KECAMATAN,
            desa: desa_name,
          },
        },
        update: {},
        create: {
          periode_id: PERIODE_ID,
          kabupaten: KABUPATEN,
          kecamatan: KECAMATAN,
          desa: desa_name,
          kuota: 10,
        },
      });
      console.log(`✓ ${desa_name} (id=${result.id})`);
      created++;
    } catch (err) {
      console.error(`✗ ${desa_name}:`, err);
    }
  }

  console.log(`Total dibuat/exist: ${created}/${TOTAL_DESA}`);
}

main().finally(() => prisma.$disconnect());
