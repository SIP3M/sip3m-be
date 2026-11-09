import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client";

// =============================================================
// Seed mahasiswa — user + pendaftaran KKM (VERIFIED, BELUM ditempatkan).
// - Membuat user pada rentang NIM di bawah, lalu mendaftarkannya sebagai
//   KkmPeserta status VERIFIED pada periode tujuan (lihat PESERTA_PERIODE_ID).
// - Tidak membuat KkmKelompok / KkmLocation dan TIDAK mengisi kelompok_id
//   (penempatan kelompok dilakukan manual / via Generate KKM).
// - NIM & email: 210411<START..END>@student.umc.ac.id
// - Password semua akun: Mahasiswa123!
// - Nama & prodi diacak; idempoten (upsert per email / [periode,user]) — aman diulang.
// - User lama di luar rentang ini tidak disentuh.
//
// Jalankan: npx ts-node prisma/seed-mahasiswa.ts
// =============================================================

const prisma = new PrismaClient();

// Rentang NIM yang dibuat: 210411201 .. 210411400 (200 user baru)
const START_INDEX = 201;
const END_INDEX = 400;
const TOTAL = END_INDEX - START_INDEX + 1;
const NIM_PREFIX = "210411";
const PASSWORD = "Mahasiswa123!";
// Semester seragam supaya semua lolos filter minimal semester saat Generate KKM.
// (Ubah jadi angka acak bila ingin variasi.)
const SEMESTER = 7;

// Periode tujuan pendaftaran otomatis: "TESTING MALAM HARI" (AKTIF).
const PESERTA_PERIODE_ID = 30;
// Set false bila hanya ingin membuat user tanpa mendaftarkan ke periode.
const DAFTARKAN_KE_PERIODE = true;

const FIRST_NAMES = [
  "Andi", "Budi", "Citra", "Dian", "Eko", "Fajar", "Gita", "Hendra", "Indah",
  "Joko", "Kartika", "Lukman", "Maya", "Nurul", "Oki", "Putri", "Rahmat",
  "Siti", "Taufik", "Umar", "Wulan", "Yudi", "Zahra", "Rina", "Agus", "Dewi",
  "Farhan", "Hadi", "Intan", "Bayu", "Lestari", "Nanda", "Rizki", "Ayu",
  "Bambang", "Cahya", "Doni", "Elsa", "Fitri", "Galih", "Hasan", "Ika",
  "Joni", "Kiki", "Lia", "Miko", "Novi", "Omar", "Puri", "Qori", "Rudi",
  "Sari", "Tini", "Uli", "Vina", "Wati", "Xena", "Yani", "Zaki", "Arif",
] as const;

const LAST_NAMES = [
  "Pratama", "Santoso", "Wijaya", "Nugroho", "Gunawan", "Widodo", "Hakim",
  "Hidayah", "Setiawan", "Hidayat", "Aminah", "Faruq", "Saputra", "Kusuma",
  "Maharani", "Susanto", "Handayani", "Kurniawan", "Utami", "Firmansyah",
  "Wulandari", "Maulana", "Pertiwi", "Ramadhani", "Anjani", "Purnama",
  "Setyawan", "Anggraini", "Wibowo", "Ningsih", "Permata", "Kurnia",
  "Astuti", "Halim", "Suryana", "Negara", "Hamdani", "Syahputra", "Utari",
  "Maulida",
] as const;

const GENDERS = ["Laki-laki", "Perempuan"] as const;

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log(`🌱 Seed ${TOTAL} mahasiswa (user + pendaftaran KKM)...`);

  await prisma.roles.upsert({
    where: { roles: "MAHASISWA" },
    update: {},
    create: { roles: "MAHASISWA" },
  });
  const role = await prisma.roles.findUnique({ where: { roles: "MAHASISWA" } });
  if (!role) throw new Error("Role MAHASISWA tidak ditemukan.");

  const prodiRows = await prisma.programStudi.findMany({ orderBy: { id: "asc" } });
  if (prodiRows.length === 0) {
    throw new Error("Program studi kosong — jalankan `npm run seed` dulu untuk data master.");
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);
  let created = 0;
  let updated = 0;

  for (let idx = START_INDEX; idx <= END_INDEX; idx += 1) {
    const nim = `${NIM_PREFIX}${String(idx).padStart(3, "0")}`;
    const email = `${nim}@student.umc.ac.id`;
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const prodi = pick(prodiRows);

    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      await prisma.users.update({
        where: { id: existing.id },
        data: {
          name,
          semester: SEMESTER,
          program_studi_id: prodi.id,
          fakultas_id: prodi.fakultas_id,
          jenis_kelamin: pick(GENDERS),
          is_active: true,
        },
      });
      updated += 1;
    } else {
      await prisma.users.create({
        data: {
          name,
          email,
          username: nim,
          nidn_nip: nim,
          password_hash: hashed,
          role_id: role.id,
          fakultas_id: prodi.fakultas_id,
          program_studi_id: prodi.id,
          semester: SEMESTER,
          jenis_kelamin: pick(GENDERS),
          is_active: true,
        },
      });
      created += 1;
    }
  }

  const nimList = Array.from({ length: TOTAL }, (_, k) =>
    `${NIM_PREFIX}${String(START_INDEX + k).padStart(3, "0")}`,
  );

  // ---- Pendaftaran KKM otomatis (VERIFIED, belum ditempatkan) ----
  let pesertaBaru = 0;
  let pesertaAda = 0;
  if (DAFTARKAN_KE_PERIODE) {
    const periode = await prisma.kkmPeriod.findUnique({
      where: { id: PESERTA_PERIODE_ID },
    });
    if (!periode) {
      throw new Error(`Periode id=${PESERTA_PERIODE_ID} tidak ditemukan di database.`);
    }

    const users = await prisma.users.findMany({
      where: { nidn_nip: { in: nimList } },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const userIds = users.map((u) => u.id);
    const sudahAda = await prisma.kkmPeserta.count({
      where: { periode_id: PESERTA_PERIODE_ID, user_id: { in: userIds } },
    });
    pesertaAda = sudahAda;
    pesertaBaru = userIds.length - sudahAda;

    console.log(
      `📝 Mendaftarkan ${users.length} user ke periode "${periode.nama_periode}" ` +
        `(id=${periode.id}) — VERIFIED, kelompok_id=null...`,
    );

    for (const userId of userIds) {
      await prisma.kkmPeserta.upsert({
        where: {
          periode_id_user_id: { periode_id: PESERTA_PERIODE_ID, user_id: userId },
        },
        // Paksa VERIFIED agar semua siap test Generate KKM; kelompok_id TIDAK
        // disentuh agar penempatan yang sudah ada tidak hilang.
        update: { status: "VERIFIED" },
        create: {
          periode_id: PESERTA_PERIODE_ID,
          user_id: userId,
          status: "VERIFIED",
          kelompok_id: null,
          jabatan: "ANGGOTA",
        },
      });
    }
  }

  const [totalUser, pesertaRows, kelompokRows] = await Promise.all([
    prisma.users.count({ where: { nidn_nip: { in: nimList } } }),
    prisma.kkmPeserta.count({ where: { user: { nidn_nip: { in: nimList } } } }),
    prisma.kkmPeserta.count({
      where: { kelompok_id: { not: null }, user: { nidn_nip: { in: nimList } } },
    }),
  ]);
  const verifiedDiPeriode = await prisma.kkmPeserta.count({
    where: {
      periode_id: PESERTA_PERIODE_ID,
      status: "VERIFIED",
      user: { nidn_nip: { in: nimList } },
    },
  });

  const firstNim = `${NIM_PREFIX}${String(START_INDEX).padStart(3, "0")}`;
  console.log(`✅ Selesai. Baru dibuat: ${created} | Diperbarui: ${updated}`);
  console.log(`   Rentang NIM ${firstNim} .. ${NIM_PREFIX}${String(END_INDEX).padStart(3, "0")}`);
  console.log(`   User pada rentang di DB       : ${totalUser} / ${TOTAL}`);
  if (DAFTARKAN_KE_PERIODE) {
    console.log(
      `   Peserta periode ${PESERTA_PERIODE_ID} (baru/sudah) : ${pesertaBaru} / ${pesertaAda}`,
    );
    console.log(`   Status VERIFIED di periode     : ${verifiedDiPeriode} / ${TOTAL}`);
  }
  console.log(`   KkmPeserta (total semua periode): ${pesertaRows}`);
  console.log(`   Sudah ditempatkan ke kelompok   : ${kelompokRows} (harus 0)`);
  console.log(`   Login: ${firstNim}@student.umc.ac.id / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
