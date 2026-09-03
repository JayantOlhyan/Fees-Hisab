'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  Receipt,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  History,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR, formatDateReadable } from '@/lib/utils';
import { FeeStatus } from '@/types';
import { generateCurrentPeriodFeesAction } from '@/actions/fee.actions';
import { RecordPaymentModal, FeeRecordPaymentTarget } from '@/components/RecordPaymentModal';
import { PaymentHistoryModal } from '@/components/PaymentHistoryModal';

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

  // Payment Recording Modal State
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<FeeRecordPaymentTarget | null>(
    null
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Payment History Modal State
  const [selectedFeeForHistory, setSelectedFeeForHistory] = useState<FeeItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Feedback banner for payment recorded
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string>('');

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
        const { created, existing } = res.data;
        setGenerationFeedback(
          `Generated ${created} new fee record(s). (${existing} already existed).`
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

  const openPaymentModal = (item: FeeItem) => {
    setSelectedFeeForPayment({
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
    setIsPaymentModalOpen(true);
  };

  const openHistoryModal = (item: FeeItem) => {
    setSelectedFeeForHistory(item);
    setIsHistoryModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccessToast('Payment recorded successfully!');
    router.refresh();
    setTimeout(() => {
      setPaymentSuccessToast('');
    }, 4000);
  };

  // Filter pipeline
  const filteredItems = useMemo(() => {
    return initialFees.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.studentName.toLowerCase().includes(q);
        const matchesClass = item.className?.toLowerCase().includes(q);
        const matchesGuardian = item.guardianName?.toLowerCase().includes(q);
        const matchesPhone = item.phone?.includes(q);
        if (!matchesName && !matchesClass && !matchesGuardian && !matchesPhone) {
          return false;
        }
      }
      return true;
    });
  }, [initialFees, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Monthly Fees Register</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Monthly tuition fee ledger · Track due dates, collections, and outstanding amounts
          </p>
        </div>

        {/* Generate Period Fees Button */}
        <button
          onClick={handleGeneratePeriod}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-200" />
          )}
          <span>Generate {monthName} Fees</span>
        </button>
      </div>

      {/* Generation Feedback Banner */}
      {generationFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between gap-2 ${
            generationFeedback.startsWith('Generated')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {generationFeedback.startsWith('Generated') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{generationFeedback}</span>
          </div>
          <button
            onClick={() => setGenerationFeedback('')}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Payment Success Toast */}
      {paymentSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{paymentSuccessToast}</span>
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
            aria-label="Search fee records"
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
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => {
                const outstandingNum = Number(item.outstanding);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/students/${item.studentId}`}
                        className="font-bold text-slate-900 group-hover:text-emerald-600 transition block"
                      >
                        {item.studentName}
                      </Link>
                      {item.guardianName && (
                        <span className="text-[11px] text-slate-400 block">
                          {item.guardianName}
                        </span>
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
                      {formatINR(outstandingNum)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {outstandingNum > 0 ? (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs py-1.5 px-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Cleared</span>
                          </span>
                        )}

                        {Number(item.totalPaid) > 0 && (
                          <button
                            type="button"
                            onClick={() => openHistoryModal(item)}
                            title="View payment transactions"
                            aria-label={`View payments for ${item.studentName}`}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          filteredItems.map((item) => {
            const outstandingNum = Number(item.outstanding);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/students/${item.studentId}`}
                      className="font-bold text-sm text-slate-900 hover:text-emerald-600 transition block truncate"
                    >
                      {item.studentName}
                    </Link>
                    <span className="text-[11px] text-slate-400 block">
                      {item.className || 'Individual'}{' '}
                      {item.guardianName ? `· ${item.guardianName}` : ''}
                    </span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Due Date</span>
                    <span className="font-semibold text-slate-800">
                      {formatDateReadable(item.dueDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Paid</span>
                    <span className="font-bold text-emerald-600">
                      {formatINR(Number(item.totalPaid))}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Outstanding</span>
                    <span className="font-extrabold text-slate-900">
                      {formatINR(outstandingNum)}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Row */}
                <div className="flex items-center justify-between pt-1">
                  {Number(item.totalPaid) > 0 ? (
                    <button
                      type="button"
                      onClick={() => openHistoryModal(item)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
                    >
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>History</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {outstandingNum > 0 ? (
                    <button
                      type="button"
                      onClick={() => openPaymentModal(item)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Fully Paid</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        feeRecord={selectedFeeForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Payment History Modal */}
      {selectedFeeForHistory && (
        <PaymentHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          feeRecordId={selectedFeeForHistory.id}
          studentName={selectedFeeForHistory.studentName}
          billingMonth={selectedFeeForHistory.billingMonth}
          billingYear={selectedFeeForHistory.billingYear}
          amountDue={selectedFeeForHistory.amountDue}
          totalPaid={selectedFeeForHistory.totalPaid}
          outstanding={selectedFeeForHistory.outstanding}
        />
      )}
    </div>
  );
};
