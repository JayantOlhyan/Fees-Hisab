import React from 'react';
import { Navigation } from '@/components/Navigation';
import { StudentsClient, StudentListItem } from './StudentsClient';
import { StudentService } from '@/services/students/student.service';
import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
export default async function StudentsPage() {
  const session = await requireAuth();



  let students: Awaited<ReturnType<typeof StudentService.getStudents>> = [];
  try {
    students = await StudentService.getStudents(session.userId, true);
  } catch {
    students = [];
  }

  const sourceStudents = students.map((s) => ({
    id: s.id,
    name: s.name,
    guardianName: s.guardianName,
    phone: s.phone,
    className: s.className,
    school: s.school,
    subjects: s.subjects,
    monthlyFee: s.monthlyFee.toString(),
    feeDueDay: s.feeDueDay,
    joiningDate: s.joiningDate.toISOString(),
    status: s.status,
  }));



  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        <StudentsClient initialStudents={sourceStudents} />
      </main>
    </div>
  );
}
