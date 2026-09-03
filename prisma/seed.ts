import { PrismaClient, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Phase 1 development database...');

  // 1. Create Demo Teacher Account
  const passwordHash = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { email: 'demo.teacher@fees-hisab.in' },
    update: {},
    create: {
      email: 'demo.teacher@fees-hisab.in',
      passwordHash,
      name: 'Sunita Sharma',
      salutation: "Ma'am",
    },
  });

  console.log(`Created teacher: ${teacher.name} (${teacher.email})`);

  // 2. Clear all demo data
  await prisma.payment.deleteMany({ where: { student: { userId: teacher.id } } });
  await prisma.feeRecord.deleteMany({ where: { student: { userId: teacher.id } } });
  await prisma.student.deleteMany({ where: { userId: teacher.id } });

  console.log('✅ Clean state initialized successfully!');
}


main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
