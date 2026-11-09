import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

// =============================================================
// Seed KKM Location — 20 desa dummy untuk periode 30.
// - Kabupaten: "Test Kabupaten"
// - Kecamatan: "Test Kecamatan"
// - Desa: "Desa Testing 1" … "Desa Testing 20"
// - Kuota: 10 (default per desa)
// - Idempoten: cek exist dulu, skip jika sudah ada.
//
// Jalankan: npx ts-node prisma/seed-kkm-location.ts
// =============================================================

const prisma = new PrismaClient();

const PERIODE_ID = 30; // TESTING MALAM HARI
const KABUPATEN = "Test Kabupaten";
const KECAMATAN = "Test Kecamatan";
const KUOTA_PER_DESA = 10;
const TOTAL_DESA = 20;

async function main() {
  console.log(
    `🌱 Seed ${TOTAL_DESA} desa untuk periode ${PERIODE_ID} (${KABUPATEN} / ${KECAMATAN})...`,
  );

  // Cek periode ada
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: PERIODE_ID } });
  if (!periode) {
    throw new Error(`Periode id=${PERIODE_ID} tidak ditemukan.`);
  }

  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= TOTAL_DESA; i += 1) {
    const nama_desa = `Desa Testing ${i}`;

    // Cek apakah kombinasi periode+kabupaten+kecamatan+desa sudah ada
    const existing = await prisma.kkmLocation.findUnique({
      where: {
        periode_id_kabupaten_kecamatan_desa: {
          periode_id: PERIODE_ID,
          kabupaten: KABUPATEN,
          kecamatan: KECAMATAN,
          desa: nama_desa,
        },
      },
    });

    if (existing) {
      console.log(`   ⏭️  ${nama_desa} sudah ada (id=${existing.id})`);
      skipped += 1;
    } else {
      await prisma.kkmLocation.create({
        data: {
          periode_id: PERIODE_ID,
          kabupaten: KABUPATEN,
          kecamatan: KECAMATAN,
          desa: nama_desa,
          kuota: KUOTA_PER_DESA,
        },
      });
      console.log(`   ✅ ${nama_desa} dibuat`);
      created += 1;
    }
  }

  // Statistik
  const totalLocation = await prisma.kkmLocation.count({
    where: {
      periode_id: PERIODE_ID,
      kabupaten: KABUPATEN,
      kecamatan: KECAMATAN,
    },
  });

  console.log(`\n✅ Selesai.`);
  console.log(`   Dibuat: ${created}`);
  console.log(`   Skip (sudah ada): ${skipped}`);
  console.log(
    `   Total di DB (${KABUPATEN}/${KECAMATAN}): ${totalLocation} / ${TOTAL_DESA}`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
