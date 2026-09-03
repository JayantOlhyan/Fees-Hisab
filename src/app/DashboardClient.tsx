'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Plus,
  Receipt,
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { RecordPaymentModal, FeeRecordPaymentTarget } from '@/components/RecordPaymentModal';
import { AddStudentModal } from '@/components/AddStudentModal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR, formatMonthName, formatDateReadable } from '@/lib/utils';
import {
  DashboardSummary,
  DashboardNeedsAttentionItem,
} from '@/services/dashboard/dashboard.service';
import { generateCurrentPeriodFeesAction } from '@/actions/fee.actions';

interface DashboardClientProps {
  summary: DashboardSummary;
}

export const DashboardClient: React.FC<DashboardClientProps> = ({ summary }) => {
  const router = useRouter();
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<FeeRecordPaymentTarget | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const currentYearMonth = `${summary.billingYear}-${String(summary.billingMonth).padStart(2, '0')}`;

  const handleOpenRecordPayment = (item: DashboardNeedsAttentionItem) => {
    setSelectedFeeRecord({
      id: item.id,
      studentId: item.studentId,
      studentName: item.studentName,
      className: item.className,
      billingMonth: item.billingMonth,
      billingYear: item.billingYear,
      amountDue: item.amountDue,
      totalPaid: item.totalPaid,
      outstanding: item.outstanding,
    });
    setIsRecordModalOpen(true);
  };

  const handleGenerateFees = async () => {
    setIsGenerating(true);
    try {
      const res = await generateCurrentPeriodFeesAction(summary.billingYear, summary.billingMonth);
      if (res.success) {
        setToastMessage(`Generated fees for ${res.data.createdCount} students!`);
        router.refresh();
      } else {
        setToastMessage(res.error || 'Failed to generate fees');
      }
    } catch {
      setToastMessage('An error occurred generating fees');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handlePaymentSuccess = () => {
    setToastMessage('Payment recorded successfully!');
    router.refresh();
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation onOpenAddStudent={() => setIsAddStudentModalOpen(true)} />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        {toastMessage && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tuition fee summary & collections for {formatMonthName(currentYearMonth)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{formatMonthName(currentYearMonth)}</span>
            </div>

            {!summary.hasFeeRecords && summary.activeStudentsCount > 0 && (
              <button
                type="button"
                onClick={handleGenerateFees}
                disabled={isGenerating}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Generate {formatMonthName(summary.billingMonth)} Fees</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State: No Active Students */}
        {summary.activeStudentsCount === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-2xs space-y-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <UserCheck className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-bold text-slate-900">No Active Students Yet</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Add your students to start tracking monthly tuition fees, due dates, and payment
                history.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Student</span>
              </button>
            </div>
          </div>
        ) : (
          /* Primary Summary Cards Grid */
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Card 1: Active Students */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Active Students</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {summary.activeStudentsCount}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    Includes only ACTIVE
                  </span>
                </div>
              </div>

              {/* Card 2: Collected This Month */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Collected This Month</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
                    {formatINR(Number(summary.collectedThisMonth))}
                  </span>
                  <span className="block text-[11px] text-emerald-700/80 mt-0.5">
                    Total payments received
                  </span>
                </div>
              </div>

              {/* Card 3: Outstanding This Month */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Outstanding</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                    <span className="font-bold text-amber-600 text-xs">₹</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {formatINR(Number(summary.outstandingThisMonth))}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    Remaining to collect
                  </span>
                </div>
              </div>

              {/* Card 4: Overdue */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Overdue</span>
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-red-600 tracking-tight">
                    {summary.overdueCount}
                  </span>
                  <span className="block text-[11px] text-red-700/80 mt-0.5">Past due date</span>
                </div>
              </div>
            </div>

            {/* Status Breakdown Strip */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                This Month Overview
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-emerald-950 block text-sm">
                      {summary.paidCount}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">Fully Paid</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-amber-950 block text-sm">
                      {summary.partiallyPaidCount}
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">Partially Paid</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                  <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-blue-950 block text-sm">
                      {summary.dueCount + summary.upcomingCount}
                    </span>
                    <span className="text-[11px] text-blue-700 font-medium">Due / Upcoming</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-red-50/60 border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-red-950 block text-sm">
                      {summary.overdueCount}
                    </span>
                    <span className="text-[11px] text-red-700 font-medium">Overdue</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty State: Fees not generated for current month */}
            {!summary.hasFeeRecords && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-6 sm:p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-amber-950 text-base">
                  No Fees Generated for {formatMonthName(summary.billingMonth)}
                </h3>
                <p className="text-xs text-amber-800/80 max-w-md mx-auto leading-relaxed">
                  You have {summary.activeStudentsCount} active students. Generate tuition fee
                  records for this month to start tracking due dates and collections.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateFees}
                    disabled={isGenerating}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Generate {formatMonthName(summary.billingMonth)} Fees</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Grid: Needs Attention & Recent Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Needs Attention (Span 2) */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                    <span>Needs Attention</span>
                    {summary.needsAttention.length > 0 && (
                      <span className="text-xs font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {summary.needsAttention.length}
                      </span>
                    )}
                  </h2>
                  <Link
                    href="/fees"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                  >
                    <span>View Fees Register</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {summary.needsAttention.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-2xs">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold text-sm">
                      ✓
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">All fees are on track!</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      No overdue or pending fee collections required for this month.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summary.needsAttention.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 flex-shrink-0">
                            {item.studentName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/students/${item.studentId}`}
                              className="font-bold text-sm sm:text-base text-slate-900 hover:text-emerald-600 transition truncate block"
                            >
                              {item.studentName}
                            </Link>
                            <p className="text-xs text-slate-500 truncate">
                              {item.className || 'Individual'} · Due{' '}
                              {formatDateReadable(item.dueDate)}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <StatusBadge status={item.status} size="sm" />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="font-extrabold text-sm sm:text-base text-red-600">
                            {formatINR(Number(item.outstanding))}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            outstanding
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenRecordPayment(item)}
                            className="mt-2 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-2xs"
                          >
                            Record Fee
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Recent Payments (Span 1) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base sm:text-lg text-slate-900">Recent Payments</h2>
                  <Link
                    href="/fees"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 divide-y divide-slate-100">
                  {summary.recentPayments.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No payments recorded yet.
                    </div>
                  ) : (
                    summary.recentPayments.map((pay) => (
                      <div
                        key={pay.id}
                        className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {pay.studentName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-xs text-slate-800 truncate">
                              {pay.studentName}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>{formatDateReadable(pay.paymentDate)}</span>
                              <span>·</span>
                              <span className="text-emerald-700 font-medium">
                                {pay.paymentMethod}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-xs sm:text-sm text-emerald-600 block">
                            +{formatINR(Number(pay.amount))}
                          </span>
                          <span className="text-[10px] text-slate-400">Collected</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pure Hisab Banner */}
                <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-xs">
                      ₹
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-950">Pure Hisab Tip</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">
                        Tuition fees for each month are tracked automatically based on each
                        student&apos;s due date. No paper registers needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="space-y-3 pt-2">
              <h2 className="font-bold text-base text-slate-900">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(true)}
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block group-hover:text-emerald-700 transition">
                        Add Student
                      </span>
                      <span className="text-[11px] text-slate-400">Enroll new student</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
                </button>

                <Link
                  href="/fees"
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block group-hover:text-emerald-700 transition">
                        View Fees
                      </span>
                      <span className="text-[11px] text-slate-400">Monthly fees register</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
                </Link>

                <Link
                  href="/students"
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block group-hover:text-emerald-700 transition">
                        Manage Students
                      </span>
                      <span className="text-[11px] text-slate-400">Student roster & profiles</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Payment Recording Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        feeRecord={selectedFeeRecord}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onStudentAdded={() => {
          setToastMessage('Student created successfully!');
          router.refresh();
          setTimeout(() => setToastMessage(''), 4000);
        }}
      />
    </div>
  );
};

export default DashboardClient;
