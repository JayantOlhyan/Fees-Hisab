import React from 'react';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { StudentDetailClient, SerializedPayment } from './StudentDetailClient';
import { StudentService } from '@/services/students/student.service';
import { PaymentService } from '@/services/payments/payment.service';
import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { initialStudents } from '@/data/seedData';
import { Student } from '@/types';

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { id } = await params;
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect('/login');
  }

  let student;
  try {
    student = await StudentService.getStudentById(session.userId, id);
  } catch {
    // If not found in database, check seedData fallback
    const fallback = initialStudents.find((s: Student) => s.id === id);
    if (!fallback) {
      notFound();
    }
    student = {
      id: fallback.id,
      userId: session.userId,
      name: fallback.name,
      guardianName: fallback.guardianName ?? null,
      phone: fallback.phone ?? null,
      className: fallback.class ?? null,
      school: fallback.school ?? null,
      subjects: fallback.subjects,
      joiningDate: new Date(fallback.joiningDate),
      monthlyFee: fallback.monthlyFee,
      feeDueDay: fallback.feeDueDay,
      status: fallback.status,
      notes: fallback.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  let payments: SerializedPayment[] = [];
  try {
    const rawPayments = await PaymentService.getPaymentsForStudent(session.userId, id);
    payments = rawPayments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      paymentDate: p.paymentDate.toISOString(),
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      feeRecordId: p.feeRecordId,
    }));
  } catch {
    payments = [];
  }

  const serializedStudent = {
    id: student.id,
    name: student.name,
    guardianName: student.guardianName,
    phone: student.phone,
    className: student.className,
    school: student.school,
    subjects: student.subjects,
    joiningDate: student.joiningDate.toISOString(),
    monthlyFee: student.monthlyFee.toString(),
    feeDueDay: student.feeDueDay,
    status: student.status,
    notes: student.notes,
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
