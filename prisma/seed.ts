import 'dotenv/config'; 
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@lppm.ac.id';

  const existingAdmin = await prisma.users.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('Admin already exists.');
    return;
  }

  const adminRole = await prisma.roles.findUnique({
    where: { roles: 'ADMIN_LPPM' },
  });

  if (!adminRole) {
    throw new Error('ADMIN_LPPM role not found.');
  }

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  await prisma.users.create({
    data: {
      name: 'Admin LPPM',
      email: adminEmail,
      password_hash: passwordHash,
      role_id: adminRole.id,
      is_active: true,
    },
  });

  console.log('Admin LPPM created successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
