'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { StatusBadge } from '@/components/StatusBadge';
import {
  getStudents,
  getFeeRecords,
  getPayments,
  ensureFeeRecordsForMonth,
  getYearMonthString,
} from '@/lib/storage';
import { formatINR, formatMonthName, formatDateReadable } from '@/lib/utils';
import { Student, FeeRecord, Payment } from '@/types';

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const ym = getYearMonthString(now);
    setCurrentMonth(ym);
    ensureFeeRecordsForMonth(ym);
    setStudents(getStudents());
    setFeeRecords(getFeeRecords());
    setPayments(getPayments());
  }, []);

  const activeStudents = useMemo(() => students.filter((s) => s.status === 'ACTIVE'), [students]);

  // Report 1: Monthly Collection Summary
  const monthlySummary = useMemo(() => {
    const monthRecs = feeRecords.filter((r) => r.billingMonth === currentMonth);
    let totalExpected = 0;
    let totalCollected = 0;
    let studentsPaidCount = 0;
    let studentsPendingCount = 0;

    monthRecs.forEach((r) => {
      totalExpected += r.amountDue;
      totalCollected += r.amountPaid;
      if (r.status === 'PAID') {
        studentsPaidCount += 1;
      } else {
        studentsPendingCount += 1;
      }
    });

    const totalOutstanding = Math.max(0, totalExpected - totalCollected);
    const collectionPercentage =
      totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      studentsPaidCount,
      studentsPendingCount,
      collectionPercentage,
    };
  }, [feeRecords, currentMonth]);

  // Report 2: Outstanding Fees by Student (sorted descending by outstanding amount)
  const outstandingList = useMemo(() => {
    const studentDues: { student: Student; outstanding: number; overdueCount: number }[] = [];

    activeStudents.forEach((st) => {
      const recs = feeRecords.filter((r) => r.studentId === st.id);
      let studentOut = 0;
      let overdue = 0;
      recs.forEach((r) => {
        const out = Math.max(0, r.amountDue - r.amountPaid);
        studentOut += out;
        if (out > 0 && r.status === 'OVERDUE') overdue += 1;
      });

      if (studentOut > 0) {
        studentDues.push({ student: st, outstanding: studentOut, overdueCount: overdue });
      }
    });

    return studentDues.sort((a, b) => b.outstanding - a.outstanding);
  }, [activeStudents, feeRecords]);

  // Report 3: Historical Totals across All Active Students
  const studentHistoricalSummary = useMemo(() => {
    return activeStudents
      .map((st) => {
        const recs = feeRecords.filter((r) => r.studentId === st.id);
        const lifetimePaid = recs.reduce((acc, r) => acc + r.amountPaid, 0);
        const currentDue = recs.reduce(
          (acc, r) => acc + Math.max(0, r.amountDue - r.amountPaid),
          0
        );
        const paidMonths = recs.filter((r) => r.status === 'PAID').length;

        return {
          student: st,
          lifetimePaid,
          currentDue,
          paidMonths,
        };
      })
      .sort((a, b) => b.lifetimePaid - a.lifetimePaid);
  }, [activeStudents, feeRecords]);

  const availableMonths = useMemo(() => {
    const months = [];
    const d = new Date();
    for (let i = -6; i <= 6; i++) {
      const target = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const ym = getYearMonthString(target);
      const label = target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ ym, label });
    }
    return months;
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Reports & Insights
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Clear financial hisab for collections and pending dues
            </p>
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-600 mr-2" />
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              aria-label="Filter report by month"
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m.ym} value={m.ym}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 1: Monthly Collection Report (PRD section 16) */}
        <div className="mt-6">
          <h2 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Monthly Collection — {formatMonthName(currentMonth)}</span>
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-400 font-medium block">Total Expected</span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 block">
                {formatINR(monthlySummary.totalExpected)}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-emerald-600 font-medium block">
                Total Collected
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-0.5 block">
                {formatINR(monthlySummary.totalCollected)}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                {monthlySummary.collectionPercentage}% collected
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">Students Paid</span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 block">
                {monthlySummary.studentsPaidCount}
              </span>
              <span className="text-[10px] text-slate-400">All dues cleared</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-red-500 font-medium block">Students Pending</span>
              <span className="text-lg sm:text-xl font-extrabold text-red-600 mt-0.5 block">
                {monthlySummary.studentsPendingCount}
              </span>
              <span className="text-[10px] text-slate-400">Pending or overdue</span>
            </div>
          </div>
        </div>

        {/* Section 2: Outstanding Fees by Student (PRD section 16) */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Outstanding Fees Breakdown</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Total Outstanding:{' '}
              <strong className="text-red-600">{formatINR(monthlySummary.totalOutstanding)}</strong>
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {outstandingList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                🎉 No students have outstanding fees right now!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Monthly Fee</th>
                      <th className="py-3 px-4 text-right">Amount Owed</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {outstandingList.map(({ student, outstanding, overdueCount }) => (
                      <tr key={student.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {student.name}
                          {overdueCount > 0 && (
                            <span className="ml-2 text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
                              Overdue
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{student.class}</td>
                        <td className="py-3 px-4 text-slate-700">
                          {formatINR(student.monthlyFee)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-red-600 text-sm">
                          {formatINR(outstanding)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/students/${student.id}`}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                          >
                            View Student →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Student-Wise Historical Summary (PRD section 16) */}
        <div className="mt-8">
          <h2 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <span>Student Lifetime Summary</span>
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-right">Months Paid</th>
                    <th className="py-3 px-4 text-right">Total Paid Historically</th>
                    <th className="py-3 px-4 text-right">Current Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {studentHistoricalSummary.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        No student records found. Click &quot;+ Add Student&quot; to start recording payments.
                      </td>
                    </tr>
                  ) : (
                    studentHistoricalSummary.map(
                      ({ student, lifetimePaid, currentDue, paidMonths }) => (
                        <tr key={student.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <Link
                              href={`/students/${student.id}`}
                              className="font-bold text-slate-900 hover:text-emerald-600 transition"
                            >
                              {student.name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{student.class}</td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {paidMonths} {paidMonths === 1 ? 'month' : 'months'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            {formatINR(lifetimePaid)}
                          </td>
                          <td className="py-3 px-4 text-right font-black">
                            <span className={currentDue > 0 ? 'text-red-600' : 'text-slate-400'}>
                              {formatINR(currentDue)}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

