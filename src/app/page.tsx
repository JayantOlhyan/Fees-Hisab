'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Calendar,
  ArrowRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';
import { AddStudentModal } from '@/components/AddStudentModal';
import { StatusBadge } from '@/components/StatusBadge';
import {
  getStudents,
  getFeeRecords,
  getPayments,
  getSettings,
  ensureFeeRecordsForMonth,
  getYearMonthString,
} from '@/lib/storage';
import { formatINR, formatMonthName, formatDateReadable } from '@/lib/utils';
import { Student, FeeRecord, FeeRecordWithStudent } from '@/types';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');
  const [settings, setSettings] = useState(getSettings());
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState(getPayments());

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<FeeRecord | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const loadData = () => {
    const s = getSettings();
    setSettings(s);
    ensureFeeRecordsForMonth(currentMonth);
    setStudents(getStudents());
    setFeeRecords(getFeeRecords());
    setPayments(getPayments());
  };

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    // Default to Sept 2026 or current actual date
    const ym = getYearMonthString(now);
    setCurrentMonth(ym);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, currentMonth]);

  // Calculations
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.status === 'ACTIVE');
  }, [students]);

  const monthRecords = useMemo(() => {
    return feeRecords.filter((r) => r.billingMonth === currentMonth);
  }, [feeRecords, currentMonth]);

  const metrics = useMemo(() => {
    let collected = 0;
    let outstanding = 0;
    let overdueCount = 0;

    monthRecords.forEach((record) => {
      collected += record.amountPaid;
      const due = Math.max(0, record.amountDue - record.amountPaid);
      outstanding += due;
      if (due > 0 && record.status === 'OVERDUE') {
        overdueCount += 1;
      }
    });

    return {
      totalStudents: activeStudents.length,
      collectedThisMonth: collected,
      totalOutstanding: outstanding,
      overdueStudentsCount: overdueCount,
    };
  }, [monthRecords, activeStudents]);

  // Fees requiring attention (Overdue, Due today, or Partially Paid)
  const attentionFees = useMemo(() => {
    const list: FeeRecordWithStudent[] = [];
    monthRecords.forEach((record) => {
      const student = activeStudents.find((s) => s.id === record.studentId);
      if (student) {
        const remaining = Math.max(0, record.amountDue - record.amountPaid);
        if (
          remaining > 0 &&
          (record.status === 'OVERDUE' ||
            record.status === 'DUE' ||
            record.status === 'PARTIALLY_PAID')
        ) {
          list.push({
            ...record,
            student,
            outstanding: remaining,
          });
        }
      }
    });

    // Sort: OVERDUE first, then DUE, then PARTIALLY_PAID
    return list.sort((a, b) => {
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [monthRecords, activeStudents]);

  // Recent payments with student details
  const recentPaymentsWithDetails = useMemo(() => {
    return payments.slice(0, 5).map((pay) => {
      const student = students.find((s) => s.id === pay.studentId);
      return {
        ...pay,
        studentName: student?.name || 'Student',
        studentClass: student?.class || '',
      };
    });
  }, [payments, students]);

  const handleOpenPayment = (record: FeeRecord, student: Student) => {
    setSelectedFeeRecord(record);
    setSelectedStudent(student);
    setIsRecordModalOpen(true);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center font-medium text-slate-500 animate-pulse">
          Loading Fees Hisab...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation onOpenAddStudent={() => setIsAddStudentModalOpen(true)} />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        {/* Top Header / Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200/80">
          <div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70 inline-block mb-1">
              Tuition Fee Register
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Good afternoon, {settings.salutation}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Here is your tuition collection status for today.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Month Selector */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-emerald-600 mr-2" />
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                aria-label="Select billing month"
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="2026-07">July 2026</option>
                <option value="2026-08">August 2026</option>
                <option value="2026-09">September 2026</option>
                <option value="2026-10">October 2026</option>
              </select>
            </div>

            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="md:hidden flex items-center justify-center p-2 bg-emerald-600 text-white rounded-xl shadow-xs"
              title="Add Student"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Cards (Exact match to Mockup) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
          {/* Total Students */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Students</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-600" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {metrics.totalStudents}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">Active enrolled</span>
            </div>
          </div>

          {/* Collected This Month */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Collected This Month</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
                {formatINR(metrics.collectedThisMonth)}
              </span>
              <span className="block text-[11px] text-emerald-700/80 mt-0.5">
                In {formatMonthName(currentMonth)}
              </span>
            </div>
          </div>

          {/* Outstanding */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Outstanding</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="font-bold text-amber-600 text-xs">₹</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatINR(metrics.totalOutstanding)}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">Pending collection</span>
            </div>
          </div>

          {/* Overdue Students */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Overdue</span>
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-red-600 tracking-tight">
                  {metrics.overdueStudentsCount}
                </span>
                <span className="text-sm font-semibold text-slate-500">Students</span>
              </div>
              <span className="block text-[11px] text-red-500/90 mt-0.5">Action needed</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fees Requiring Attention (Takes 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-slate-900">
                  Fees Requiring Attention
                </h2>
                {attentionFees.length > 0 && (
                  <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {attentionFees.length}
                  </span>
                )}
              </div>
              <Link
                href="/fees"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {attentionFees.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                  ✓
                </div>
                <h3 className="font-bold text-slate-800 text-sm">All fees are on track!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  No overdue or pending fees for this month.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {attentionFees.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 flex-shrink-0">
                        {item.student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/students/${item.student.id}`}
                          className="font-bold text-sm sm:text-base text-slate-900 hover:text-emerald-600 transition truncate block"
                        >
                          {item.student.name}
                        </Link>
                        <p className="text-xs text-slate-500 truncate">
                          {item.student.class} · {item.student.subjects.join(', ')}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={item.status} size="sm" />
                          <span className="text-[11px] text-slate-400">
                            Due: {formatDateReadable(item.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="font-extrabold text-sm sm:text-base text-red-600">
                        {formatINR(item.outstanding)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">outstanding</span>
                      <button
                        onClick={() => handleOpenPayment(item, item.student)}
                        className="mt-2 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-2xs"
                      >
                        Record Fee
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Recent Payments */}
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
              {recentPaymentsWithDetails.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No payments recorded yet.
                </div>
              ) : (
                recentPaymentsWithDetails.map((pay) => (
                  <div
                    key={pay.id}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                        {pay.studentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-slate-800">{pay.studentName}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span>{formatDateReadable(pay.paymentDate)}</span>
                          <span>·</span>
                          <span className="text-emerald-700 font-medium">{pay.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs sm:text-sm text-emerald-600 block">
                        +{formatINR(pay.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400">Collected</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Banner / Tip */}
            <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-4 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-xs">
                  ₹
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950">Pure Hisab Tip</h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Fees for upcoming months are calculated automatically using each student’s due
                    date. No manual work needed every month.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        feeRecord={selectedFeeRecord}
        student={selectedStudent}
        onPaymentSuccess={loadData}
      />

      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onStudentAdded={loadData}
      />
    </div>
  );
}
