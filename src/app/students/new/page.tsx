import React from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { StudentForm } from '@/components/StudentForm';

export default function AddStudentPage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-3xl mx-auto w-full px-4 sm:px-6 pt-5">
        {/* Back Link */}
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students</span>
        </Link>

        {/* Page Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Add New Student
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Set up student details and monthly fee configuration
            </p>
          </div>
        </div>

        {/* Form */}
        <StudentForm />
      </main>
    </div>
  );
}
