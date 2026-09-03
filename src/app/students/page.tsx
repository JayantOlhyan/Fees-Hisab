import React from 'react';
import { Navigation } from '@/components/Navigation';
import { StudentsClient, StudentListItem } from './StudentsClient';
import { getStudents } from '@/lib/notion/service';
import { requireAuth } from '@/lib/auth/session';

export default async function StudentsPage() {
  await requireAuth();

  let sourceStudents: StudentListItem[] = [];
  try {
    const rawStudents = await getStudents(true);
    sourceStudents = rawStudents.map((s) => ({
      id: s.id,
      name: s.name,
      guardianName: s.guardianName ?? null,
      phone: s.phone ?? null,
      className: s.class || null,
      school: s.school ?? null,
      subjects: s.subjects,
      monthlyFee: String(s.monthlyFee),
      feeDueDay: s.feeDueDay,
      joiningDate: s.joiningDate,
      status: s.status as 'ACTIVE' | 'ARCHIVED',
    }));
  } catch {
    sourceStudents = [];
  }



  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        <StudentsClient initialStudents={sourceStudents} />
      </main>
    </div>
  );
}
