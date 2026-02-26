// prisma/seed.ts
const { PrismaClient } = require('../src/generated/prisma/client');
const bcrypt = require('bcrypt');

/**
 * Type helper untuk role
 * (biar TS tidak implicit any)
 */
type Role = {
  id: number;
  roles: string;
};

const prisma = new PrismaClient();

async function main() {
  console.log('🔥 SEED SCRIPT STARTED');

  const passwordHash = await bcrypt.hash('password123', 10);

  const roles = (await prisma.roles.findMany()) as Role[];

  if (roles.length === 0) {
    throw new Error('Roles table is empty. Seed roles first.');
  }

  const users = [
    {
      name: 'Admin LPPM',
      email: 'admin@lppm.ac.id',
      role: 'ADMIN_LPPM',
    },
    {
      name: 'Staff LPPM',
      email: 'staff@lppm.ac.id',
      role: 'STAFF_LPPM',
    },
    {
      name: 'Dosen Dummy',
      email: 'dosen@kampus.ac.id',
      role: 'DOSEN',
      nidn_nip: '1234567890',
      fakultas: 'Teknik',
    },
    {
      name: 'Reviewer Dummy',
      email: 'reviewer@kampus.ac.id',
      role: 'REVIEWER',
    },
    {
      name: 'Pihak Eksternal',
      email: 'eksternal@mitra.ac.id',
      role: 'PIHAK EKSTERNAL',
    },
  ];

  for (const u of users) {
    const role = roles.find((r: Role) => r.roles === u.role);

    if (!role) {
      console.warn(`⚠️ Role ${u.role} not found, skipping`);
      continue;
    }

    await prisma.users.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password_hash: passwordHash,
        role_id: role.id,
        is_active: true,
      },
    });
  }

  console.log('✅ Dummy users seeded successfully');
}

main()
  .catch((e: unknown) => {
    console.error('❌ SEED ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
