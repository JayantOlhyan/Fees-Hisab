import React from 'react';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { StudentDetailClient } from './StudentDetailClient';
import { StudentService } from '@/services/students/student.service';
import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

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
    notFound();
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
        <StudentDetailClient student={serializedStudent} />
      </main>
    </div>
  );
}
