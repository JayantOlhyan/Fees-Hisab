'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  ChevronRight,
  Filter,
  Phone,
  BookOpen,
  Archive,
  GraduationCap,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { StatusBadge } from '@/components/StatusBadge';
import { AddStudentModal } from '@/components/AddStudentModal';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';
import {
  getStudents,
  getFeeRecords,
  ensureFeeRecordsForMonth,
  getYearMonthString,
} from '@/lib/storage';
import { formatINR } from '@/lib/utils';
import { Student, FeeRecord, FeeStatus } from '@/types';

type StatusFilter = 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE' | 'ARCHIVED';

export default function StudentsPage() {
  const [mounted, setMounted] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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

  // Derive unique classes for filter
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.class) set.add(s.class);
    });
    return Array.from(set).sort();
  }, [students]);

  // Students with current month status and outstanding
  const studentListWithStatus = useMemo(() => {
    return students.map((student) => {
      const record = feeRecords.find(
        (r) => r.studentId === student.id && r.billingMonth === currentMonth
      );
      const outstanding = record ? Math.max(0, record.amountDue - record.amountPaid) : 0;
      const status: FeeStatus = record ? record.status : 'UPCOMING';

      return {
        student,
        currentRecord: record,
        outstanding,
        status,
      };
    });
  }, [students, feeRecords, currentMonth]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentListWithStatus.filter(({ student, outstanding, status }) => {
      // Archived filter logic
      if (statusFilter === 'ARCHIVED') {
        if (student.status !== 'ARCHIVED') return false;
      } else {
        if (student.status === 'ARCHIVED') return false;
      }

      // Status filter
      if (statusFilter === 'PAID' && status !== 'PAID') return false;
      if (statusFilter === 'PENDING' && (status === 'PAID' || outstanding === 0)) return false;
      if (statusFilter === 'OVERDUE' && status !== 'OVERDUE') return false;

      // Class filter
      if (classFilter !== 'ALL' && student.class !== classFilter) return false;

      // Search Query (Student name, Guardian name, Phone)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = student.name.toLowerCase().includes(query);
        const matchesGuardian = student.guardianName?.toLowerCase().includes(query);
        const matchesPhone = student.phone?.includes(query);
        if (!matchesName && !matchesGuardian && !matchesPhone) return false;
      }

      return true;
    });
  }, [studentListWithStatus, statusFilter, classFilter, searchQuery]);

  const handleOpenPayment = (record: FeeRecord | undefined, student: Student) => {
    if (!record) return;
    setSelectedRecord(record);
    setSelectedStudent(student);
    setIsRecordModalOpen(true);
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation onOpenAddStudent={() => setIsAddModalOpen(true)} />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Students</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}{' '}
              listed
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Student</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, parent name, or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 shadow-2xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters Tabs */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {(['ALL', 'PAID', 'PENDING', 'OVERDUE', 'ARCHIVED'] as StatusFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === tab
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {tab === 'ALL' ? 'All Students' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Class Dropdown Filter */}
          {uniqueClasses.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                aria-label="Filter by class"
                className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
              >
                <option value="ALL">All Classes</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Student Cards List */}
        <div className="mt-4 space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700 text-sm">No students found</h3>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Add your first student to get started!'}
              </p>
            </div>
          ) : (
            filteredStudents.map(({ student, currentRecord, outstanding, status }) => (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center font-bold text-base flex-shrink-0 shadow-2xs">
                    {student.name.charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/students/${student.id}`}
                        className="font-bold text-sm sm:text-base text-slate-900 hover:text-emerald-600 transition truncate"
                      >
                        {student.name}
                      </Link>
                      {student.status === 'ARCHIVED' && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                          Archived
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">{student.class}</span>
                      <span>·</span>
                      <span>{student.subjects.join(', ')}</span>
                      {student.phone && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <StatusBadge status={status} size="sm" />
                      <span className="text-xs text-slate-500">
                        Monthly:{' '}
                        <strong className="text-slate-800">{formatINR(student.monthlyFee)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Outstanding & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Outstanding
                    </span>
                    <span
                      className={`font-extrabold text-sm sm:text-base ${
                        outstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatINR(outstanding)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {outstanding > 0 && student.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleOpenPayment(currentRecord, student)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition"
                      >
                        Record Payment
                      </button>
                    )}

                    <Link
                      href={`/students/${student.id}`}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                      title="View Student Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStudentAdded={loadData}
      />

      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        feeRecord={selectedRecord}
        student={selectedStudent}
        onPaymentSuccess={loadData}
      />
    </div>
  );
}
