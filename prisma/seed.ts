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

  // 2. Clear old data for clean seed
  await prisma.payment.deleteMany({ where: { student: { userId: teacher.id } } });
  await prisma.feeRecord.deleteMany({ where: { student: { userId: teacher.id } } });
  await prisma.student.deleteMany({ where: { userId: teacher.id } });

  // 3. Create Demo Students
  const student1 = await prisma.student.create({
    data: {
      userId: teacher.id,
      name: 'Aarav Sharma',
      guardianName: 'Rajesh Sharma',
      phone: '9876543210',
      className: 'Class 8',
      school: 'Delhi Public School',
      subjects: ['Mathematics', 'Science'],
      joiningDate: new Date('2026-06-01'),
      monthlyFee: 2000.0,
      feeDueDay: 5,
      status: 'ACTIVE',
      notes: 'Morning batch. Focus on Algebra.',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      userId: teacher.id,
      name: 'Priya Verma',
      guardianName: 'Deepak Verma',
      phone: '9811223344',
      className: 'Class 10',
      school: 'St. Xavier High School',
      subjects: ['Mathematics'],
      joiningDate: new Date('2026-07-01'),
      monthlyFee: 2500.0,
      feeDueDay: 3,
      status: 'ACTIVE',
      notes: 'Board exam batch.',
    },
  });

  const student3 = await prisma.student.create({
    data: {
      userId: teacher.id,
      name: 'Rohan Singh',
      guardianName: 'Vikram Singh',
      phone: '9988776655',
      className: 'Class 7',
      school: 'Modern Academy',
      subjects: ['Science'],
      joiningDate: new Date('2026-08-01'),
      monthlyFee: 1500.0,
      feeDueDay: 10,
      status: 'ACTIVE',
      notes: 'Evening batch.',
    },
  });

  // 4. Create Fee Records & Payment Transactions
  // Aarav: Aug 2026 Paid in full
  const fee1Aug = await prisma.feeRecord.create({
    data: {
      studentId: student1.id,
      billingYear: 2026,
      billingMonth: 8,
      amountDue: 2000.0,
      dueDate: new Date('2026-08-05'),
      status: 'PAID',
    },
  });

  await prisma.payment.create({
    data: {
      studentId: student1.id,
      feeRecordId: fee1Aug.id,
      amount: 2000.0,
      paymentDate: new Date('2026-08-04'),
      paymentMethod: PaymentMethod.UPI,
      notes: 'Paid via GPay',
    },
  });

  // Aarav: Sept 2026 Partial payment (₹1,000 paid out of ₹2,000)
  const fee1Sep = await prisma.feeRecord.create({
    data: {
      studentId: student1.id,
      billingYear: 2026,
      billingMonth: 9,
      amountDue: 2000.0,
      dueDate: new Date('2026-09-05'),
      status: 'PARTIALLY_PAID',
    },
  });

  await prisma.payment.create({
    data: {
      studentId: student1.id,
      feeRecordId: fee1Sep.id,
      amount: 1000.0,
      paymentDate: new Date('2026-09-02'),
      paymentMethod: PaymentMethod.CASH,
      notes: 'Cash received by teacher; remaining balance promised next week',
    },
  });

  // Priya: Sept 2026 Overdue (Due 3rd Sept, 0 paid)
  await prisma.feeRecord.create({
    data: {
      studentId: student2.id,
      billingYear: 2026,
      billingMonth: 9,
      amountDue: 2500.0,
      dueDate: new Date('2026-09-03'),
      status: 'OVERDUE',
    },
  });

  // Rohan: Sept 2026 Upcoming (Due 10th Sept)
  await prisma.feeRecord.create({
    data: {
      studentId: student3.id,
      billingYear: 2026,
      billingMonth: 9,
      amountDue: 1500.0,
      dueDate: new Date('2026-09-10'),
      status: 'UPCOMING',
    },
  });

  console.log('✅ Seed completed successfully with realistic tuition data!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
