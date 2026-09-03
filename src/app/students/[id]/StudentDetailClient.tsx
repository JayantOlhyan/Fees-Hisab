'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Edit2,
  Archive,
  RefreshCw,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Receipt,
  Loader2,
  Calendar,
} from 'lucide-react';
import { archiveStudentAction, restoreStudentAction } from '@/actions/student.actions';
import { formatINR, formatDateReadable } from '@/lib/utils';
import { PaymentMethod } from '@prisma/client';

export interface SerializedPayment {
  id: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  feeRecordId: string;
}

interface StudentDetailClientProps {
  student: {
    id: string;
    name: string;
    guardianName: string | null;
    phone: string | null;
    className: string | null;
    school: string | null;
    subjects: string[];
    joiningDate: string;
    monthlyFee: string;
    feeDueDay: number;
    status: 'ACTIVE' | 'ARCHIVED';
    notes: string | null;
  };
  payments: SerializedPayment[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

export const StudentDetailClient: React.FC<StudentDetailClientProps> = ({
  student,
  payments = [],
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'PAYMENTS'>('DETAILS');
  const [isArchiving, setIsArchiving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionError, setActionError] = useState('');

  const totalLifetimePaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  const handleArchive = async () => {
    setIsArchiving(true);
    setActionError('');
    try {
      const result = await archiveStudentAction(student.id);
      if (!result.success) {
        setActionError(result.error || 'Failed to archive student');
        setIsArchiving(false);
        return;
      }
      setShowConfirmModal(false);
      router.refresh();
    } catch {
      setActionError('An unexpected error occurred');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async () => {
    setIsArchiving(true);
    setActionError('');
    try {
      const result = await restoreStudentAction(student.id);
      if (!result.success) {
        setActionError(result.error || 'Failed to restore student');
        setIsArchiving(false);
        return;
      }
      router.refresh();
    } catch {
      setActionError('An unexpected error occurred');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Link */}
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Students</span>
      </Link>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Profile Card Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-2xl shadow-inner flex-shrink-0">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
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
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 mt-1">
                {student.guardianName && <span>Guardian: {student.guardianName}</span>}
                {student.guardianName && student.phone && <span>·</span>}
                {student.phone && (
                  <span className="flex items-center gap-1 text-slate-700 font-medium">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {student.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <Link
              href={`/students/${student.id}/edit`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Link>

            {student.status === 'ACTIVE' ? (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isArchiving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            ) : (
              <button
                onClick={handleRestore}
                disabled={isArchiving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 overflow-x-auto scrollbar-none">
          <button
            type="button"
            id="tab-details"
            onClick={() => setActiveTab('DETAILS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'DETAILS'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Details
          </button>
          <button
            type="button"
            id="tab-payments"
            data-testid="tab-payments"
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'PAYMENTS'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payments ({payments.length})</span>
          </button>
          <Link
            href="/fees"
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fees Register</span>
          </Link>
        </div>
      </div>

      {activeTab === 'DETAILS' && (
        /* 2-Column Detail Cards Grid (Matches Mockup) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Student Information */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Student Information</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Class</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {student.className}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Joining Date</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {formatDateReadable(student.joiningDate)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">School</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {student.school || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Fee Due Day</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {student.feeDueDay}th of month
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-400 block font-medium">Monthly Fee</span>
                <span className="font-extrabold text-emerald-700 text-base mt-0.5 block">
                  {formatINR(Number(student.monthlyFee))}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-400 block font-medium mb-1.5">Subjects</span>
                <div className="flex flex-wrap gap-1.5">
                  {student.subjects.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact & Notes */}
          <div className="space-y-5">
            {/* Guardian Information */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Guardian Information</span>
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Parent / Guardian</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {student.guardianName || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Phone Number</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {student.phone || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-2">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Notes</span>
              </h3>
              <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                {student.notes || 'No notes added for this student.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PAYMENTS' && (
        /* Payments Tab Content */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-medium block">Total Lifetime Paid</span>
              <span className="text-xl font-extrabold text-emerald-700">
                {formatINR(totalLifetimePaid)}
              </span>
            </div>
            <Link
              href="/fees"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5"
            >
              <Receipt className="w-4 h-4" />
              <span>Go to Fees Register</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-700 text-sm">No payment history</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Payments recorded in the Fees Register for {student.name} will be logged here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatINR(Number(p.amount))}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold text-[10px]">
                          {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateReadable(p.paymentDate)}</span>
                      </div>
                      {p.notes && (
                        <p className="text-slate-600 text-[11px] italic bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {p.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Archive className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Archive {student.name}?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
              {student.name} will no longer appear in your active student list. All historical
              records and fees will be preserved safely.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isArchiving}
                onClick={handleArchive}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Archive Student</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
