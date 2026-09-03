import React from 'react';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { StudentDetailClient, SerializedPayment } from './StudentDetailClient';
import { getStudentById, getPayments } from '@/lib/notion/service';

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { id } = await params;

  let student;
  try {
    student = await getStudentById(id);
  } catch {
    notFound();
  }

  if (!student) {
    notFound();
  }

  let payments: SerializedPayment[] = [];
  try {
    const rawPayments = await getPayments(id);
    payments = rawPayments.map((p) => ({
      id: p.id,
      amount: String(p.amount),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      notes: p.notes ?? null,
      feeRecordId: p.feeRecordId,
    }));
  } catch {
    payments = [];
  }

  const serializedStudent = {
    id: student.id,
    name: student.name,
    guardianName: student.guardianName ?? null,
    phone: student.phone ?? null,
    className: student.class ?? null,
    school: student.school ?? null,
    subjects: student.subjects,
    joiningDate: student.joiningDate,
    monthlyFee: String(student.monthlyFee),
    feeDueDay: student.feeDueDay,
    status: student.status,
    notes: student.notes ?? null,
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        <StudentDetailClient student={serializedStudent} payments={payments} />
      </main>
    </div>
  );
}
