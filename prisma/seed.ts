import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding data Fakultas dan Program Studi...");

  // Data master Fakultas dan Prodinya
  const dataFakultas = [
    {
      nama: "Fakultas Teknik",
      prodi: [
        "S1 Teknik Informatika",
        "S1 Teknik Industri",
        "D3 Teknik Informatika",
        "S1 Teknik Peternakan",
      ],
    },
    {
      nama: "Fakultas Ekonomi dan Bisnis",
      prodi: ["S1 Manajemen", "S1 Akuntansi"],
    },
    {
      nama: "Fakultas Keguruan dan Ilmu Pendidikan",
      prodi: [
        "S1 Pendidikan Guru Sekolah Dasar",
        "S1 Pendidikan Guru Pendidikan Anak Usia Dini",
        "S1 Pendidikan Bahasa Inggris",
        "S1 Pendidikan Matematika",
        "S1 Pendidikan IPA",
        "S1 Pendidikan Kimia",
      ],
    },
    {
      nama: "Fakultas Ilmu Kesehatan",
      prodi: ["S1 Ilmu Keperawatan", "S1 Ilmu Gizi", "S1 Ilmu Keolahragaan", "Profesi Ners"],
    },
    {
      nama: "Fakultas Hukum",
      prodi: ["S1 Ilmu Hukum"],
    }, 
    {
      nama: "Fakultas Ilmu Sosial dan Ilmu Politik",
      prodi: ["S1 Ilmu Komunikasi", "D3 Hubungan Masyarakat (Humas)"],
    },
    {
      nama: "Fakultas Agama Islam",
      prodi: ["S1 Ilmu Al-Qur'an dan Tafsir", "S1 Tasawuf dan Psikoterapi"],
    }
  ];

  for (const item of dataFakultas) {
    // 1. Simpan atau pastikan Fakultas ada di DB
    const fakultas = await prisma.fakultas.upsert({
      where: { nama: item.nama },
      update: {}, // Jika sudah ada, jangan ubah
      create: { nama: item.nama },
    });

    // 2. Simpan semua prodi yang terkait dengan Fakultas tersebut
    for (const namaProdi of item.prodi) {
      // Cari apakah prodi sudah terdaftar di fakultas tersebut
      const existingProdi = await prisma.programStudi.findFirst({
        where: {
          nama: namaProdi,
          fakultas_id: fakultas.id,
        },
      });

      if (!existingProdi) {
        await prisma.programStudi.create({
          data: {
            nama: namaProdi,
            fakultas_id: fakultas.id,
          },
        });
      }
    }
  }

  console.log(
    "✅ Seeding selesai! Data Fakultas & Prodi berhasil ditambahkan.",
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
