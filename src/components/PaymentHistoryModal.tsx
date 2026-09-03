'use client';

import React, { useState, useEffect } from 'react';
import { X, Receipt, Loader2, Calendar, FileText } from 'lucide-react';
import { formatINR, formatDateReadable, formatMonthName } from '@/lib/utils';
import { getPaymentsForFeeAction } from '@/actions/payment.actions';
import { Payment } from '@prisma/client';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeRecordId: string | null;
  studentName: string;
  billingMonth: number;
  billingYear: number;
  amountDue: number | string;
  totalPaid: number | string;
  outstanding: number | string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  feeRecordId,
  studentName,
  billingMonth,
  billingYear,
  amountDue,
  totalPaid,
  outstanding,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && feeRecordId) {
      setIsLoading(true);
      setError('');
      getPaymentsForFeeAction(feeRecordId)
        .then((res) => {
          if (res.success) {
            setPayments(res.data);
          } else {
            setError(res.error || 'Failed to load payments');
          }
        })
        .catch(() => setError('Failed to load payment history'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, feeRecordId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !feeRecordId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-history-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <h3 id="payment-history-title" className="font-bold text-base leading-tight">
              Payment History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {studentName} · {formatMonthName(billingMonth)} {billingYear}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Summary */}
        <div className="bg-slate-50 border-b border-slate-200/80 p-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Due</span>
            <span className="font-bold text-slate-800">{formatINR(Number(amountDue))}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Paid</span>
            <span className="font-bold text-emerald-600">{formatINR(Number(totalPaid))}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">
              Outstanding
            </span>
            <span className="font-bold text-red-600">{formatINR(Number(outstanding))}</span>
          </div>
        </div>

        {/* Payments List */}
        <div className="p-5 max-h-80 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Loading transactions...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          ) : payments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No payments recorded yet</p>
              <p className="text-[11px] mt-0.5">
                Payments recorded against this fee will appear here.
              </p>
            </div>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">
                    {formatINR(Number(p.amount))}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold text-[10px]">
                    {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatDateReadable(p.paymentDate)}
                  </span>
                </div>

                {p.notes && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-2 py-1 mt-1 border border-slate-100 flex items-start gap-1">
                    <FileText className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{p.notes}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
