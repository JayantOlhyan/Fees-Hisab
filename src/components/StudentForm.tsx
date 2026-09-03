'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentCreateInput } from '@/lib/validations';
import { createStudentAction, updateStudentAction } from '@/actions/student.actions';
import { AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const AVAILABLE_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Social Science',
  'Hindi',
  'Physics',
  'Chemistry',
  'Biology',
  'Other',
];

interface StudentFormProps {
  initialData?: {
    id: string;
    name: string;
    guardianName?: string | null;
    phone?: string | null;
    className: string;
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
  const [className, setClassName] = useState(initialData?.className || 'Class 8');
  const [school, setSchool] = useState(initialData?.school || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    initialData?.subjects || ['Mathematics', 'Science']
  );
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
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
    setFieldErrors({});

    const feeNum = parseFloat(monthlyFee);
    const dueDayNum = parseInt(feeDueDay, 10);

    const payload: StudentCreateInput = {
      name: name.trim(),
      guardianName: guardianName.trim() || undefined,
      phone: phone.trim() || undefined,
      className: className.trim(),
      school: school.trim() || undefined,
      subjects: selectedSubjects.length > 0 ? selectedSubjects : ['Other'],
      monthlyFee: feeNum,
      feeDueDay: dueDayNum,
      joiningDate,
      notes: notes.trim() || undefined,
    };

    setIsSubmitting(true);

    try {
      if (isEdit && initialData) {
        const result = await updateStudentAction(initialData.id, payload);
        if (!result.success) {
          setErrorMessage(result.error || 'Failed to update student');
          if (result.details && typeof result.details === 'object') {
            setFieldErrors(result.details as Record<string, string[]>);
          }
          setIsSubmitting(false);
          return;
        }
        setSuccessMessage('Student updated successfully.');
        setTimeout(() => {
          router.push(`/students/${initialData.id}`);
          router.refresh();
        }, 800);
      } else {
        const result = await createStudentAction(payload);
        if (!result.success) {
          setErrorMessage(result.error || 'Failed to add student');
          if (result.details && typeof result.details === 'object') {
            setFieldErrors(result.details as Record<string, string[]>);
          }
          setIsSubmitting(false);
          return;
        }
        setSuccessMessage('Student added successfully.');
        setTimeout(() => {
          router.push('/students');
          router.refresh();
        }, 800);
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
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
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700 font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section 1: Student Information */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Student Information
        </h2>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Student Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
          />
          {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name[0]}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Class / Grade <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Class 8 or 10th"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
            {fieldErrors.className && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.className[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">School Name</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. DAV Public School"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>

        {/* Subjects Multi-select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Subjects Taught <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SUBJECTS.map((sub) => {
              const isSelected = selectedSubjects.includes(sub);
              return (
                <button
                  type="button"
                  key={sub}
                  onClick={() => toggleSubject(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
          {fieldErrors.subjects && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.subjects[0]}</p>
          )}
        </div>
      </div>

      {/* Section 2: Contact Information */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Contact Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Parent / Guardian Name
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210 (10 digits)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.phone[0]}</p>
            )}
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Monthly Fee (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                placeholder="2000"
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
              />
            </div>
            {fieldErrors.monthlyFee && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.monthlyFee[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fee Due Day <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="31"
                required
                value={feeDueDay}
                onChange={(e) => setFeeDueDay(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                th of month
              </span>
            </div>
            {fieldErrors.feeDueDay && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.feeDueDay[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Joining Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
            {fieldErrors.joiningDate && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.joiningDate[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Notes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Additional Notes
        </h2>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning batch timing, special attention on Algebra, board target"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={isEdit && initialData ? `/students/${initialData.id}` : '/students'}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm shadow-emerald-200 transition flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{isEdit ? 'Save Changes' : 'Add Student'}</span>
        </button>
      </div>
    </form>
  );
};
