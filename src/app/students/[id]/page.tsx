'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Phone, 
  School, 
  Calendar, 
  BookOpen, 
  User, 
  FileText, 
  Archive, 
  CheckCircle,
  PlusCircle,
  Clock,
  Trash2,
  Edit2
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';
import { 
  getStudents, 
  getFeeRecords, 
  archiveStudent, 
  unarchiveStudent,
  updateStudent
} from '@/lib/storage';
import { formatINR, formatMonthName, formatDateReadable } from '@/lib/utils';
import { Student, FeeRecord } from '@/types';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editGuardian, setEditGuardian] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editSubjects, setEditSubjects] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadData = () => {
    const allStudents = getStudents();
    const found = allStudents.find((s) => s.id === studentId);
    if (found) {
      setStudent(found);
      setEditName(found.name);
      setEditGuardian(found.guardianName || '');
      setEditPhone(found.phone || '');
      setEditClass(found.class);
      setEditSchool(found.school || '');
      setEditFee(found.monthlyFee.toString());
      setEditDueDay(found.feeDueDay.toString());
      setEditSubjects(found.subjects.join(', '));
      setEditNotes(found.notes || '');
    }

    const allRecords = getFeeRecords();
    const studentHistory = allRecords
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
    setFeeRecords(studentHistory);
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [studentId]);

  // Historical calculations
  const totalLifetimePaid = useMemo(() => {
    return feeRecords.reduce((acc, curr) => acc + curr.amountPaid, 0);
  }, [feeRecords]);

  const totalOutstanding = useMemo(() => {
    return feeRecords.reduce((acc, curr) => acc + Math.max(0, curr.amountDue - curr.amountPaid), 0);
  }, [feeRecords]);

  const handleToggleArchive = () => {
    if (!student) return;
    if (student.status === 'ACTIVE') {
      const confirmArchive = confirm(
        'Archive this student? They will not appear in the active student list, but all historical fee records will remain safe.'
      );
      if (confirmArchive) {
        archiveStudent(student.id);
        loadData();
      }
    } else {
      unarchiveStudent(student.id);
      loadData();
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const fee = parseFloat(editFee);
    const dueDay = parseInt(editDueDay, 10);
    const subjects = editSubjects.split(',').map((s) => s.trim()).filter(Boolean);

    updateStudent(student.id, {
      name: editName.trim(),
      guardianName: editGuardian.trim() || undefined,
      phone: editPhone.trim() || undefined,
      class: editClass.trim(),
      school: editSchool.trim() || undefined,
      monthlyFee: isNaN(fee) ? student.monthlyFee : fee,
      feeDueDay: isNaN(dueDay) ? student.feeDueDay : dueDay,
      subjects: subjects.length > 0 ? subjects : student.subjects,
      notes: editNotes.trim() || undefined,
    });

    setIsEditing(false);
    loadData();
  };

  const handleOpenPayment = (record: FeeRecord) => {
    setSelectedRecord(record);
    setIsRecordModalOpen(true);
  };

  if (!mounted) return null;

  if (!student) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-600">Student not found</p>
          <Link href="/students" className="mt-2 text-xs text-emerald-600 font-bold hover:underline inline-block">
            ← Back to Students
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        {/* Back Link */}
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students</span>
        </Link>

        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-2xl shadow-inner flex-shrink-0">
                {student.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">{student.name}</h1>
                  {student.status === 'ARCHIVED' ? (
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200">
                      Archived
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {student.class} · {student.subjects.join(', ')}
                </p>
                {student.school && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <School className="w-3.5 h-3.5" />
                    {student.school}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
              </button>

              <button
                onClick={handleToggleArchive}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                title={student.status === 'ACTIVE' ? 'Archive Student' : 'Unarchive Student'}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{student.status === 'ACTIVE' ? 'Archive' : 'Activate'}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Monthly Fee</span>
              <span className="text-base font-extrabold text-slate-900">{formatINR(student.monthlyFee)}</span>
            </div>

            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Fee Due Day</span>
              <span className="text-base font-extrabold text-slate-900">{student.feeDueDay}th of month</span>
            </div>

            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Current Outstanding</span>
              <span className={`text-base font-extrabold ${totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatINR(totalOutstanding)}
              </span>
            </div>

            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Total Paid Historically</span>
              <span className="text-base font-extrabold text-emerald-600">{formatINR(totalLifetimePaid)}</span>
            </div>
          </div>
        </div>

        {/* Edit Form if open */}
        {isEditing && (
          <form onSubmit={handleSaveEdit} className="mt-5 bg-white rounded-3xl border border-emerald-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-600" />
              Edit Student Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Guardian Name</label>
                <input
                  type="text"
                  value={editGuardian}
                  onChange={(e) => setEditGuardian(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class</label>
                <input
                  type="text"
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">School</label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Fee (₹)</label>
                <input
                  type="number"
                  value={editFee}
                  onChange={(e) => setEditFee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Due Day (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editDueDay}
                  onChange={(e) => setEditDueDay(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subjects (comma separated)</label>
                <input
                  type="text"
                  value={editSubjects}
                  onChange={(e) => setEditSubjects(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* 4 Logical Sections (Basic Info & Academic Info Details) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Basic & Guardian Info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Basic Information
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Parent / Guardian</span>
                <span className="font-semibold text-slate-800">{student.guardianName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-800">{student.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Joining Date</span>
                <span className="font-semibold text-slate-800">{formatDateReadable(student.joiningDate)}</span>
              </div>
            </div>
          </div>

          {/* Academic & Notes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Academic Information & Notes
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Class</span>
                <span className="font-semibold text-slate-800">{student.class}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Subjects</span>
                <span className="font-semibold text-slate-800">{student.subjects.join(', ')}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-0.5">Notes</span>
                <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {student.notes || 'No notes added'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Complete Fee History (PRD section 11 & Mockup) */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900">Complete Fee History</h2>
              <p className="text-xs text-slate-500">Record of all monthly billing cycles and payments</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {feeRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No fee records generated for this student yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Billing Month</th>
                      <th className="py-3 px-4 text-right">Amount Due</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Outstanding</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {feeRecords.map((record) => {
                      const outstanding = Math.max(0, record.amountDue - record.amountPaid);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">
                              {formatMonthName(record.billingMonth)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Due: {formatDateReadable(record.dueDate)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-700">
                            {formatINR(record.amountDue)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            {formatINR(record.amountPaid)}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold">
                            <span className={outstanding > 0 ? 'text-red-600' : 'text-slate-400'}>
                              {formatINR(outstanding)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <StatusBadge status={record.status} size="sm" />
                          </td>
                          <td className="py-3 px-4 text-right">
                            {outstanding > 0 ? (
                              <button
                                onClick={() => handleOpenPayment(record)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs transition"
                              >
                                Record Payment
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Cleared
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        feeRecord={selectedRecord}
        student={student}
        onPaymentSuccess={loadData}
      />
    </div>
  );
}
