import { PrismaClient } from '../src/generated/prisma/client'; 
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const commonPassword = await bcrypt.hash('password123', saltRounds);

  console.log('Sedang menghapus data lama...');
  // Hapus users terlebih dahulu sebelum roles untuk menghindari error Foreign Key
  await prisma.users.deleteMany();
  await prisma.roles.deleteMany();

  console.log('Membuat data roles...');
  const adminRole = await prisma.roles.create({ data: { roles: 'ADMIN_LPPM' } });
  const staffRole = await prisma.roles.create({ data: { roles: 'STAFF_LPPM' } });
  const reviewerRole = await prisma.roles.create({ data: { roles: 'REVIEWER' } });
  const reviewerEksRole = await prisma.roles.create({ data: { roles: 'REVIEWER_EKSTERNAL' } });
  const dosenRole = await prisma.roles.create({ data: { roles: 'DOSEN' } });

  console.log('Menyiapkan data user dummy...');
  const users = [
    {
      name: 'Admin LPPM Utama',
      email: 'admin@lppm.ac.id',
      password_hash: commonPassword,
      role_id: adminRole.id,
      nidn_nip: '1111111111',
    },
    {
      name: 'Staff LPPM',
      email: 'staff@lppm.ac.id',
      password_hash: commonPassword,
      role_id: staffRole.id,
      nidn_nip: '2222222222',
    },
    {
      name: 'Reviewer Internal',
      email: 'reviewer@lppm.ac.id',
      password_hash: commonPassword,
      role_id: reviewerRole.id,
      nidn_nip: '3333333333',
    },
    {
      name: 'Reviewer Luar',
      email: 'external@gmail.com',
      password_hash: commonPassword,
      role_id: reviewerEksRole.id,
      nidn_nip: '4444444444',
    },
    {
      name: 'Dosen Pengusul',
      email: 'dosen@lppm.ac.id',
      password_hash: commonPassword,
      role_id: dosenRole.id,
      nidn_nip: '0123456789',
    },
  ];

  console.log('Memasukkan data user ke database...');
  for (const u of users) {
    const user = await prisma.users.create({
      data: u,
    });
    console.log(`Dibuat user: ${user.email} (Role ID: ${user.role_id})`);
  }

  console.log('Seeding berhasil dan selesai!');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });