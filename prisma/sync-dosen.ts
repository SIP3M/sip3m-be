/**
 * Sinkronisasi penuh Repository Publikasi Dosen (PDDikti + SINTA).
 *
 * Jalankan: npm run sync:dosen
 *
 * Dipakai untuk seed awal / penyegaran paksa dari mesin yang punya
 * browser (Edge/Chrome). Di server tanpa browser (mis. Vercel), endpoint
 * publik otomatis melewati sinkronisasi dan menyajikan data tersimpan.
 */
import "dotenv/config";
import {
  isPddiktiSyncAvailable,
} from "../src/publikasi_dan_repository/pddikti.service";
import {
  syncDosenRepositoryNow,
} from "../src/publikasi_dan_repository/dosen-repository.service";
import { prisma } from "../src/prisma";

const main = async () => {
  if (!isPddiktiSyncAvailable()) {
    console.error(
      "Browser (Edge/Chrome/Chromium) tidak ditemukan — sinkronisasi PDDikti tidak bisa dijalankan di mesin ini. " +
        "Atur PDDIKTI_BROWSER_PATH jika lokasinya tidak standar.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("Memulai sinkronisasi repository dosen ...");
  const info = await syncDosenRepositoryNow();
  const total = await prisma.dosenRepository.count();

  console.log("Selesai.");
  console.log("  status     :", info.status);
  console.log("  last_sync  :", info.last_sync_at ?? "-");
  console.log("  jumlah row :", total);
  if (info.message) console.log("  message    :", info.message);
};

main()
  .catch((error) => {
    console.error("Sinkronisasi gagal:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
