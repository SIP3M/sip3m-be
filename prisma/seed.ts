import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding data Fakultas dan Program Studi...");

  // Role MAHASISWA untuk KKM Peserta
  await prisma.roles.upsert({
    where: { roles: "MAHASISWA" },
    update: {},
    create: { roles: "MAHASISWA" },
  });
  console.log("✅ Role MAHASISWA siap.");

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

  // 20 Dummy MAHASISWA (NIM 210411001..020) - tidak assign kelompok (sesuai request: percobaan testing)
  console.log("🌱 Seeding 20 dummy MAHASISWA (kelompok_id=null, tidak assign)...");
  const mahasiswaRole = await prisma.roles.findUnique({ where: { roles: "MAHASISWA" } });
  if (!mahasiswaRole) throw new Error("Role MAHASISWA tidak ditemukan setelah upsert.");
  const prodiRows = await prisma.programStudi.findMany({ take: 20, orderBy: { id: "asc" } });
  const fakultasRows = await prisma.fakultas.findMany({ orderBy: { id: "asc" } });
  if (prodiRows.length === 0 || fakultasRows.length === 0) throw new Error("Fakultas/Prodi kosong, seed master dulu.");
  const hashed = await bcrypt.hash("Mahasiswa123!", 10);
  const dummyNames = [
    "Andi Pratama", "Budi Santoso", "Citra Dewi", "Dian Permata", "Eko Wijaya",
    "Fajar Nugroho", "Gita Sari", "Hendra Gunawan", "Indah Lestari", "Joko Widodo",
    "Kartika Putri", "Lukman Hakim", "Maya Angelina", "Nur Hidayah", "Oki Setiawan",
    "Putri Ayu", "Rahmat Hidayat", "Siti Aminah", "Taufik Hidayat", "Umar Faruq",
  ];
  for (let i = 0; i < 20; i++) {
    const nimReal = `210411${String(i + 1).padStart(3, "0")}`;
    const name = dummyNames[i];
    const prodi = prodiRows[i % prodiRows.length];
    const fakultas = fakultasRows.find((f) => f.id === prodi.fakultas_id) ?? fakultasRows[i % fakultasRows.length];
    const semester = 5 + (i % 4); // 5,6,7,8 sebar
    const email = `${nimReal}@student.umc.ac.id`;
    await prisma.users.upsert({
      where: { email },
      update: { semester, fakultas_id: fakultas.id, program_studi_id: prodi.id },
      create: {
        name,
        email,
        username: nimReal,
        nidn_nip: nimReal,
        password_hash: hashed,
        role_id: mahasiswaRole.id,
        fakultas_id: fakultas.id,
        program_studi_id: prodi.id,
        semester,
        is_active: true,
      },
    });
  }
  console.log("✅ 20 dummy MAHASISWA siap (password: Mahasiswa123!, Belum Ditempatkan semua).");

  // Peserta KKM: daftarkan 10 pertama ke periode AKTIF/ terbaru (tanpa kelompok_id) - status sebar 5 VERIFIED / 4 PENDING / 1 REJECTED untuk screenshot
  const activePeriod = await prisma.kkmPeriod.findFirst({ orderBy: { created_at: "desc" } });
  if (activePeriod) {
    const users10 = await prisma.users.findMany({
      where: { nidn_nip: { in: Array.from({ length: 10 }, (_, k) => `210411${String(k + 1).padStart(3, "0")}`) } },
      orderBy: { nidn_nip: "asc" },
    });
    const statuses: Array<"VERIFIED" | "PENDING" | "REJECTED"> = [
      "VERIFIED", "VERIFIED", "VERIFIED", "VERIFIED", "VERIFIED",
      "PENDING", "PENDING", "PENDING", "PENDING",
      "REJECTED",
    ];
    for (let idx = 0; idx < users10.length; idx++) {
      const u = users10[idx];
      const status = statuses[idx] ?? "PENDING";
      await prisma.kkmPeserta.upsert({
        where: { periode_id_user_id: { periode_id: activePeriod.id, user_id: u.id } },
        update: { status: status as never },
        create: { periode_id: activePeriod.id, user_id: u.id, status: status as never, kelompok_id: null },
      });
    }
    console.log(`✅ 10 KkmPeserta di periode ${activePeriod.id} (${activePeriod.nama_periode}) - 5V/4P/1R, semua Belum Ditempatkan.`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
