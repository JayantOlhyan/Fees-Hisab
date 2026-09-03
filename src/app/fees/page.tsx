'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';
import { AddStudentModal } from '@/components/AddStudentModal';
import {
  getStudents,
  getFeeRecords,
  ensureFeeRecordsForMonth,
  getYearMonthString,
} from '@/lib/storage';
import { formatINR, formatMonthName, formatDateReadable } from '@/lib/utils';
import { Student, FeeRecord, FeeStatus } from '@/types';

type FeeFilter = 'ALL' | 'PAID' | 'DUE' | 'PARTIALLY_PAID' | 'OVERDUE';

export default function FeesPage() {
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<FeeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<FeeRecord | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadData = () => {
    ensureFeeRecordsForMonth(currentMonth);
    setStudents(getStudents());
    setFeeRecords(getFeeRecords());
  };

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setCurrentMonth(getYearMonthString(now));
  }, []);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, currentMonth]);

  // Handle month navigation (previous / next month)
  const handleShiftMonth = (direction: -1 | 1) => {
    const [yStr, mStr] = currentMonth.split('-');
    const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1 + direction, 1);
    const newMonth = getYearMonthString(date);
    setCurrentMonth(newMonth);
  };

  // Monthly aggregated items
  const monthItems = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === 'ACTIVE');
    const records = feeRecords.filter((r) => r.billingMonth === currentMonth);

    return records
      .map((rec) => {
        const student = activeStudents.find((s) => s.id === rec.studentId);
        if (!student) return null;
        const outstanding = Math.max(0, rec.amountDue - rec.amountPaid);
        return {
          record: rec,
          student,
          outstanding,
        };
      })
      .filter(Boolean) as { record: FeeRecord; student: Student; outstanding: number }[];
  }, [feeRecords, students, currentMonth]);

  // Filtered by status and search
  const filteredItems = useMemo(() => {
    return monthItems.filter(({ record, student, outstanding }) => {
      // Status filter
      if (statusFilter === 'PAID' && record.status !== 'PAID') return false;
      if (statusFilter === 'DUE' && record.status !== 'DUE') return false;
      if (statusFilter === 'PARTIALLY_PAID' && record.status !== 'PARTIALLY_PAID') return false;
      if (statusFilter === 'OVERDUE' && record.status !== 'OVERDUE') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = student.name.toLowerCase().includes(q);
        const matchesClass = student.class.toLowerCase().includes(q);
        if (!matchesName && !matchesClass) return false;
      }

      return true;
    });
  }, [monthItems, statusFilter, searchQuery]);

  // Aggregate stats for current month view
  const monthSummary = useMemo(() => {
    let dueTotal = 0;
    let paidTotal = 0;
    let pendingTotal = 0;
    let paidCount = 0;
    let overdueCount = 0;

    monthItems.forEach(({ record, outstanding }) => {
      dueTotal += record.amountDue;
      paidTotal += record.amountPaid;
      pendingTotal += outstanding;
      if (record.status === 'PAID') paidCount += 1;
      if (record.status === 'OVERDUE') overdueCount += 1;
    });

    return { dueTotal, paidTotal, pendingTotal, paidCount, overdueCount };
  }, [monthItems]);

  const handleOpenPayment = (record: FeeRecord, student: Student) => {
    setSelectedFeeRecord(record);
    setSelectedStudent(student);
    setIsRecordModalOpen(true);
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation onOpenAddStudent={() => setIsAddModalOpen(true)} />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        {/* Top Month Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Monthly Fees</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview and fee collection for {formatMonthName(currentMonth)}
            </p>
          </div>

          {/* Month Stepper */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl p-1 shadow-2xs">
            <button
              onClick={() => handleShiftMonth(-1)}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs sm:text-sm text-slate-800">
                {formatMonthName(currentMonth)}
              </span>
            </div>
            <button
              onClick={() => handleShiftMonth(1)}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Financial Overview Strip */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-400 font-medium block">Total Due</span>
            <span className="text-base sm:text-xl font-extrabold text-slate-900">
              {formatINR(monthSummary.dueTotal)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-emerald-600 font-medium block">Collected</span>
            <span className="text-base sm:text-xl font-extrabold text-emerald-600">
              {formatINR(monthSummary.paidTotal)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-red-500 font-medium block">Pending</span>
            <span className="text-base sm:text-xl font-extrabold text-red-600">
              {formatINR(monthSummary.pendingTotal)}
            </span>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-4">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['ALL', 'PAID', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] as FeeFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === tab
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {tab === 'ALL'
                  ? 'All'
                  : tab === 'PARTIALLY_PAID'
                    ? 'Partial'
                    : tab === 'DUE'
                      ? 'Due Today'
                      : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this month..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Fees Table / Cards */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No fee records match the selected month and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4 text-right">Fee Due</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.map(({ record, student, outstanding }) => (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-600 transition block"
                        >
                          {student.name}
                        </Link>
                        <span className="text-[11px] text-slate-400 block">
                          {student.class} · Due {formatDateReadable(record.dueDate)}
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
                            onClick={() => handleOpenPayment(record, student)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-lg shadow-2xs transition"
                          >
                            Record Payment
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStudentAdded={loadData}
      />
    </div>
  );
}
