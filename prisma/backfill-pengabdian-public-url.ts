import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { supabase } from "../src/config/storage";

const prisma = new PrismaClient();
const SUPABASE_BUCKET = "lppm_documents";

/**
 * Backfill sekali jalan: isi kolom PengabdianDocuments.public_url untuk data
 * lama (yang sebelum kolom ini ada) dari file_path yang sudah tersimpan.
 *
 * Jalankan dengan: npx ts-node -r dotenv/config prisma/backfill-pengabdian-public-url.ts
 */
async function main() {
  const documents = await prisma.pengabdianDocuments.findMany({
    where: { public_url: null },
    select: { id: true, file_path: true },
  });

  if (documents.length === 0) {
    console.log(
      "Tidak ada dokumen dengan public_url NULL. Tidak ada yang perlu di-backfill.",
    );
    return;
  }

  console.log(
    `🔄 Memulai backfill public_url untuk ${documents.length} dokumen...`,
  );

  let updated = 0;
  let failed = 0;

  for (const document of documents) {
    try {
      const { data } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(document.file_path);

      await prisma.pengabdianDocuments.update({
        where: { id: document.id },
        data: { public_url: data.publicUrl },
      });

      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `❌ Gagal backfill dokumen ID ${document.id} (${document.file_path}):`,
        error,
      );
    }
  }

  console.log(
    `✅ Backfill selesai: ${updated} berhasil, ${failed} gagal dari ${documents.length} dokumen.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
