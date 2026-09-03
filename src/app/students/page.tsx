import React from 'react';
import { Navigation } from '@/components/Navigation';
import { StudentsClient, StudentListItem } from './StudentsClient';
import { StudentService } from '@/services/students/student.service';
import { getOrCreateTeacherSession } from '@/actions/student.actions';

export default async function StudentsPage() {
  const session = await getOrCreateTeacherSession();
  const students = await StudentService.getStudents(session.userId, true);

  const initialStudents: StudentListItem[] = students.map((s) => ({
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
        <StudentsClient initialStudents={initialStudents} />
      </main>
    </div>
  );
}
