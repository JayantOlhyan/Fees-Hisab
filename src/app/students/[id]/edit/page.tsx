import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { StudentForm } from '@/components/StudentForm';
import { StudentService } from '@/services/students/student.service';
import { getOrCreateTeacherSession } from '@/actions/student.actions';

interface EditStudentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStudentPage({ params }: EditStudentPageProps) {
  const { id } = await params;
  const session = await getOrCreateTeacherSession();

  let student;
  try {
    student = await StudentService.getStudentById(session.userId, id);
  } catch {
    notFound();
  }

  const initialData = {
    id: student.id,
    name: student.name,
    guardianName: student.guardianName,
    phone: student.phone,
    className: student.className,
    school: student.school,
    subjects: student.subjects,
    monthlyFee: student.monthlyFee.toString(),
    feeDueDay: student.feeDueDay,
    joiningDate: student.joiningDate.toISOString().split('T')[0],
    notes: student.notes,
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-3xl mx-auto w-full px-4 sm:px-6 pt-5">
        <Link
          href={`/students/${student.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {student.name}</span>
        </Link>

        <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Edit Student</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Update {student.name}&apos;s tuition details
            </p>
          </div>
        </div>

        <StudentForm initialData={initialData} isEdit={true} />
      </main>
    </div>
  );
}
