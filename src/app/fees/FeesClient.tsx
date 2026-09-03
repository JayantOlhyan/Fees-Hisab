'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Receipt,
  Sparkles,
  Loader2,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR, formatDateReadable } from '@/lib/utils';
import { FeeStatus } from '@prisma/client';
import { generateCurrentPeriodFeesAction } from '@/actions/fee.actions';
import { useRouter } from 'next/navigation';

export interface FeeItem {
  id: string;
  studentId: string;
  studentName: string;
  guardianName: string | null;
  phone: string | null;
  className: string | null;
  billingYear: number;
  billingMonth: number;
  amountDue: string;
  dueDate: string;
  totalPaid: string;
  outstanding: string;
  status: FeeStatus;
}

interface FeesClientProps {
  initialFees: FeeItem[];
  currentYear: number;
  currentMonth: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const FeesClient: React.FC<FeesClientProps> = ({
  initialFees,
  currentYear,
  currentMonth,
}) => {
  const router = useRouter();
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFeedback, setGenerationFeedback] = useState<string>('');

  const monthName = MONTH_NAMES[month - 1];

  const handleShiftMonth = (direction: -1 | 1) => {
    let newMonth = month + direction;
    let newYear = year;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setYear(newYear);
    setMonth(newMonth);
    router.push(`/fees?year=${newYear}&month=${newMonth}`);
  };

  const handleGeneratePeriod = async () => {
    setIsGenerating(true);
    setGenerationFeedback('');
    try {
      const res = await generateCurrentPeriodFeesAction(year, month);
      if (res.success) {
        const { createdCount, alreadyExistingCount, skippedPreJoiningCount } = res.data;
        setGenerationFeedback(
          `Generated ${createdCount} new fee record(s). (${alreadyExistingCount} already exist, ${skippedPreJoiningCount} pre-joining).`
        );
        router.refresh();
      } else {
        setGenerationFeedback(`Failed: ${res.error}`);
      }
    } catch {
      setGenerationFeedback('An error occurred during fee generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredItems = useMemo(() => {
    return initialFees.filter((fee) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && fee.status !== statusFilter) return false;

      // 2. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = fee.studentName.toLowerCase().includes(q);
        const matchesGuardian = fee.guardianName?.toLowerCase().includes(q);
        const matchesPhone = fee.phone?.includes(q);
        const matchesClass = fee.className?.toLowerCase().includes(q);

        if (!matchesName && !matchesGuardian && !matchesPhone && !matchesClass) {
          return false;
        }
      }

      return true;
    });
  }, [initialFees, statusFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header with Digital Register Title & Generate Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Monthly Fees Register</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain monthly fees, track due dates and inspect outstanding amounts.
          </p>
        </div>

        <button
          onClick={handleGeneratePeriod}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>Generate {monthName} Fees</span>
        </button>
      </div>

      {generationFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{generationFeedback}</span>
        </div>
      )}

      {/* Month Navigation Strip */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 px-4 py-3 shadow-2xs">
        <button
          onClick={() => handleShiftMonth(-1)}
          aria-label="Previous Month"
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="text-sm font-extrabold text-slate-900">
            {monthName} {year}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            {filteredItems.length} fee record(s)
          </div>
        </div>

        <button
          onClick={() => handleShiftMonth(1)}
          aria-label="Next Month"
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, class, guardian, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 shadow-2xs transition"
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

        {/* Status Dropdown */}
        <div className="flex items-center bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs shadow-2xs">
          <span className="text-slate-400 font-medium mr-2">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter fees by status"
            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="DUE">Due</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">
              No fee records for {monthName} {year}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Click &quot;Generate {monthName} Fees&quot; above to create monthly records for all
              your active students.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Fee Due</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition group">
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/students/${item.studentId}`}
                      className="font-bold text-slate-900 group-hover:text-emerald-600 transition block"
                    >
                      {item.studentName}
                    </Link>
                    {item.guardianName && (
                      <span className="text-[11px] text-slate-400 block">{item.guardianName}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {item.className || '—'}
                  </td>

                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {formatDateReadable(item.dueDate)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                    {formatINR(Number(item.amountDue))}
                  </td>

                  <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                    {formatINR(Number(item.totalPaid))}
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {formatINR(Number(item.outstanding))}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 text-sm">
              No fee records for {monthName} {year}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tap &quot;Generate {monthName} Fees&quot; to populate your tuition register.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/students/${item.studentId}`}
              className="block bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:border-emerald-300 transition"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-bold text-sm text-slate-900 truncate">{item.studentName}</div>
                <StatusBadge status={item.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2 mt-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Due Date</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateReadable(item.dueDate)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Outstanding</span>
                  <span className="font-extrabold text-slate-900">
                    {formatINR(Number(item.outstanding))}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
