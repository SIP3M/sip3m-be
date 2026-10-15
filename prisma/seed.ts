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

  // Dummy MAHASISWA dibanyakin: 200 user (210411001..200) - untuk gambaran generate rata
  const TOTAL_DUMMY = 200;
  console.log(`🌱 Seeding ${TOTAL_DUMMY} dummy MAHASISWA (kelompok_id=null, tidak assign)...`);
  const mahasiswaRole = await prisma.roles.findUnique({ where: { roles: "MAHASISWA" } });
  if (!mahasiswaRole) throw new Error("Role MAHASISWA tidak ditemukan setelah upsert.");
  const prodiRows = await prisma.programStudi.findMany({ orderBy: { id: "asc" } });
  const fakultasRows = await prisma.fakultas.findMany({ orderBy: { id: "asc" } });
  if (prodiRows.length === 0 || fakultasRows.length === 0) throw new Error("Fakultas/Prodi kosong, seed master dulu.");
  const hashed = await bcrypt.hash("Mahasiswa123!", 10);
  const firstNames = ["Andi","Budi","Citra","Dian","Eko","Fajar","Gita","Hendra","Indah","Joko","Kartika","Lukman","Maya","Nur","Oki","Putri","Rahmat","Siti","Taufik","Umar","Wulan","Yudi","Zahra","Rina","Agus","Dewi","Farhan","Hadi","Intan","Bayu","Lestari","Nanda","Rizki","Ayu","Bambang","Cahya","Doni","Elsa","Fitri","Galih","Hasan","Ika","Joni","Kiki","Lia","Miko","Novi","Omar","Puri","Qori","Rudi","Sari","Tini","Uli","Vina","Wati","Xena","Yani","Zaki"];
  const lastNames = ["Pratama","Santoso","Dewi","Permata","Wijaya","Nugroho","Sari","Gunawan","Lestari","Widodo","Putri","Hakim","Angelina","Hidayah","Setiawan","Ayu","Hidayat","Aminah","Faruq","Saputra","Kusuma","Maharani","Susanto","Handayani","Kurniawan","Utami","Firmansyah","Wulandari","Maulana","Pertiwi","Ramadhani","Saputra","Anjani","Purnama","Setyawan","Anggraini","Saputra","Wibowo","Ningsih","Pratama"];
  const genders: Array<"Laki-laki" | "Perempuan"> = ["Laki-laki", "Perempuan"];
  for (let i = 0; i < TOTAL_DUMMY; i++) {
    const nimReal = `210411${String(i + 1).padStart(3, "0")}`;
    const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}${i >= firstNames.length ? ` ${Math.floor(i / firstNames.length) + 1}` : ""}`;
    const prodi = prodiRows[i % prodiRows.length];
    const fakultas = fakultasRows.find((f) => f.id === prodi.fakultas_id) ?? fakultasRows[i % fakultasRows.length];
    const semester = 7; // wajib semester 7 untuk semua dummy (tes Generate KKM)
    const jenis_kelamin = genders[i % 2];
    const email = `${nimReal}@student.umc.ac.id`;
    await prisma.users.upsert({
      where: { email },
      update: { semester, fakultas_id: fakultas.id, program_studi_id: prodi.id, jenis_kelamin },
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
        jenis_kelamin,
        is_active: true,
      },
    });
  }
  console.log(`✅ ${TOTAL_DUMMY} dummy MAHASISWA siap (password: Mahasiswa123!, Belum Ditempatkan semua).`);

  // Peserta KKM + Lokasi/Desa dummy: 180 VERIFIED dari 200 dummy -> untuk demo distribusi rata
  const activePeriod = await prisma.kkmPeriod.findFirst({ orderBy: { created_at: "desc" } });
  if (activePeriod) {
    const allDummy = await prisma.users.findMany({
      where: { nidn_nip: { in: Array.from({ length: TOTAL_DUMMY }, (_, k) => `210411${String(k + 1).padStart(3, "0")}`) } },
      select: { id: true, nidn_nip: true },
      orderBy: { nidn_nip: "asc" },
    });
    // 180 VERIFIED (lolos generate), 12 PENDING, 8 REJECTED -> mirip Gambar 1: 1248/1180/68
    for (let idx = 0; idx < allDummy.length; idx++) {
      const u = allDummy[idx];
      let status: "VERIFIED" | "PENDING" | "REJECTED" = "VERIFIED";
      if (idx >= 180 && idx < 192) status = "PENDING";
      else if (idx >= 192) status = "REJECTED";
      await prisma.kkmPeserta.upsert({
        where: { periode_id_user_id: { periode_id: activePeriod.id, user_id: u.id } },
        update: { status: status as never, kelompok_id: null },
        create: { periode_id: activePeriod.id, user_id: u.id, status: status as never, kelompok_id: null },
      });
    }
    console.log(`✅ ${TOTAL_DUMMY} KkmPeserta di periode ${activePeriod.id} (${activePeriod.nama_periode}) - 180V/12P/8R (beberapa sem 3 untuk Validasi), semua Belum Ditempatkan.`);

    // 30 Desa dummy (kab/kec/desa) biar generate rata: 180/30 = 6 orang/kelompok rata sempurna
    const desaSeeds: Array<{ kabupaten: string; kecamatan: string; desa: string; kuota: number }> = [
      { kabupaten: "Cirebon", kecamatan: "Plumbon", desa: "Karangmulya", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Plumbon", desa: "Lurah", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Plumbon", desa: "Pamijahan", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Plumbon", desa: "Pasanggrahan", kuota: 8 },
      { kabupaten: "Cirebon", kecamatan: "Weru", desa: "Weru Kidul", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Weru", desa: "Weru Lor", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Weru", desa: "Tegalwangi", kuota: 12 },
      { kabupaten: "Cirebon", kecamatan: "Kedawung", desa: "Kedawung", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Kedawung", desa: "Kertawinangun", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Kedawung", desa: "Tuk", kuota: 8 },
      { kabupaten: "Cirebon", kecamatan: "Tengah Tani", desa: "Astana", kuota: 12 },
      { kabupaten: "Cirebon", kecamatan: "Tengah Tani", desa: "Dawuan", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Tengah Tani", desa: "Kalibaru", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Gunung Jati", desa: "Astanajapura", kuota: 12 },
      { kabupaten: "Cirebon", kecamatan: "Gunung Jati", desa: "Klayan", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Gunung Jati", desa: "Wanakaya", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Kapetakan", desa: "Pegagan Kidul", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Kapetakan", desa: "Pegagan Lor", kuota: 8 },
      { kabupaten: "Cirebon", kecamatan: "Kapetakan", desa: "Grogol", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Suranenggala", desa: "Suranenggala", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Suranenggala", desa: "Purwawinangun", kuota: 10 },
      { kabupaten: "Cirebon", kecamatan: "Suranenggala", desa: "Muara", kuota: 12 },
      { kabupaten: "Majalengka", kecamatan: "Kadipaten", desa: "Kadipaten", kuota: 10 },
      { kabupaten: "Majalengka", kecamatan: "Kadipaten", desa: "Liangjulang", kuota: 10 },
      { kabupaten: "Majalengka", kecamatan: "Jatiwangi", desa: "Jatiwangi", kuota: 12 },
      { kabupaten: "Majalengka", kecamatan: "Jatiwangi", desa: "Sukaperna", kuota: 10 },
      { kabupaten: "Kuningan", kecamatan: "Cigandamekar", desa: "Babakanjati", kuota: 10 },
      { kabupaten: "Kuningan", kecamatan: "Cigandamekar", desa: "Karangmangu", kuota: 8 },
      { kabupaten: "Indramayu", kecamatan: "Sindang", desa: "Sindang", kuota: 10 },
      { kabupaten: "Indramayu", kecamatan: "Sindang", desa: "Dermayu", kuota: 12 },
    ];
    for (const d of desaSeeds) {
      await prisma.kkmLocation.upsert({
        where: { periode_id_kabupaten_kecamatan_desa: { periode_id: activePeriod.id, kabupaten: d.kabupaten, kecamatan: d.kecamatan, desa: d.desa } },
        update: { kuota: d.kuota },
        create: { periode_id: activePeriod.id, kabupaten: d.kabupaten, kecamatan: d.kecamatan, desa: d.desa, kuota: d.kuota },
      });
    }
    // Backfill KkmKelompok untuk desa yang belum punya (1 desa=1 kelompok)
    const lokasiTanpaKelompok = await prisma.kkmLocation.findMany({ where: { periode_id: activePeriod.id, kelompok: null }, select: { id: true }, orderBy: { id: "asc" } });
    const existingCount = await prisma.kkmKelompok.count({ where: { periode_id: activePeriod.id } });
    let n = existingCount;
    for (const loc of lokasiTanpaKelompok) {
      n += 1;
      await prisma.kkmKelompok.create({ data: { periode_id: activePeriod.id, lokasi_id: loc.id, nama: `Kelompok ${String(n).padStart(2, "0")}`, dpl_id: null } });
    }
    console.log(`✅ ${desaSeeds.length} KkmLocation + ${lokasiTanpaKelompok.length} KkmKelompok backfill (1 Desa=1 Kelompok, total kelompok ${n}).`);
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
