'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ALLOWED_SUBJECTS } from '@/lib/validations';
import { createStudentAction, updateStudentAction } from '@/actions/student.actions';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface StudentFormProps {
  initialData?: {
    id: string;
    name: string;
    guardianName?: string | null;
    phone?: string | null;
    class?: string | null;
    school?: string | null;
    subjects: string[];
    monthlyFee: number | string;
    feeDueDay: number;
    joiningDate: string;
    notes?: string | null;
  };
  isEdit?: boolean;
}

export const StudentForm: React.FC<StudentFormProps> = ({ initialData, isEdit = false }) => {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || '');
  const [guardianName, setGuardianName] = useState(initialData?.guardianName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [className, setClassName] = useState(initialData?.class || '');
  const [school, setSchool] = useState(initialData?.school || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialData?.subjects || []);
  const [monthlyFee, setMonthlyFee] = useState(
    initialData?.monthlyFee ? String(initialData.monthlyFee) : '2000'
  );
  const [feeDueDay, setFeeDueDay] = useState(
    initialData?.feeDueDay ? String(initialData.feeDueDay) : '5'
  );
  const [joiningDate, setJoiningDate] = useState(
    initialData?.joiningDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const feeNum = parseFloat(monthlyFee);
    const dueDayNum = parseInt(feeDueDay, 10);

    if (!name.trim()) {
      setErrorMessage('Student Full Name is required.');
      return;
    }
    if (isNaN(feeNum) || feeNum <= 0) {
      setErrorMessage('Please enter a valid monthly fee.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit && initialData) {
        const result = await updateStudentAction(initialData.id, {
          name: name.trim(),
          guardianName: guardianName.trim() || undefined,
          phone: phone.trim() || undefined,
          className: className.trim() || undefined,
          school: school.trim() || undefined,
          subjects: selectedSubjects,
          monthlyFee: feeNum,
          feeDueDay: dueDayNum,
          joiningDate,
          notes: notes.trim() || undefined,
        });

        if (!result.success) {
          setErrorMessage(result.error);
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage('Student updated successfully.');
        setTimeout(() => {
          router.push(`/students/${initialData.id}`);
          router.refresh();
        }, 600);
      } else {
        const result = await createStudentAction({
          name: name.trim(),
          guardianName: guardianName.trim() || undefined,
          phone: phone.trim() || undefined,
          className: className.trim() || undefined,
          school: school.trim() || undefined,
          subjects: selectedSubjects.length > 0 ? selectedSubjects : ['General'],
          monthlyFee: feeNum,
          feeDueDay: dueDayNum,
          joiningDate,
          notes: notes.trim() || undefined,
        });

        if (!result.success) {
          setErrorMessage(result.error);
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage('Student added successfully.');
        setTimeout(() => {
          router.push('/students');
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section 1: Student Info */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Student Information
        </h2>

        <div>
          <label htmlFor="student-name" className="block text-xs font-bold text-slate-700 mb-1">
            Student Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="student-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Arjun Sharma"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="student-class" className="block text-xs font-bold text-slate-700 mb-1">
              Class / Grade (Optional)
            </label>
            <input
              id="student-class"
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. 10, 12, 8"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>
          <div>
            <label htmlFor="student-school" className="block text-xs font-bold text-slate-700 mb-1">
              School Name (Optional)
            </label>
            <input
              id="student-school"
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. DAV Public School"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Subjects Taught (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {ALLOWED_SUBJECTS.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => toggleSubject(subject)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedSubjects.includes(subject)
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Contact */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Contact Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="student-guardian" className="block text-xs font-bold text-slate-700 mb-1">
              Parent / Guardian Name (Optional)
            </label>
            <input
              id="student-guardian"
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="student-phone" className="block text-xs font-bold text-slate-700 mb-1">
              Contact Phone (Optional)
            </label>
            <input
              id="student-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="e.g. 9876543210 (10 digits)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Fee Setup */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Fee Configuration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="student-fee" className="block text-xs font-bold text-slate-700 mb-1">
              Monthly Fee (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              <input
                id="student-fee"
                type="number"
                required
                min="1"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                placeholder="2000"
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="student-dueday" className="block text-xs font-bold text-slate-700 mb-1">
              Fee Due Day <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="student-dueday"
                type="number"
                required
                min="1"
                max="31"
                value={feeDueDay}
                onChange={(e) => setFeeDueDay(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition pr-20"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">th of month</span>
            </div>
          </div>

          <div>
            <label htmlFor="student-joining" className="block text-xs font-bold text-slate-700 mb-1">
              Joining Date <span className="text-red-500">*</span>
            </label>
            <input
              id="student-joining"
              type="date"
              required
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Notes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Additional Notes
        </h2>
        <div>
          <label htmlFor="student-notes" className="block text-xs font-bold text-slate-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="student-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning batch timing, special attention on Algebra, board target"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-4">
        <Link
          href={isEdit && initialData ? `/students/${initialData.id}` : '/students'}
          className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition shadow-sm"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Student'}
        </button>
      </div>
    </form>
  );
};
