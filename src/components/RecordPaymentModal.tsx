'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatINR, formatMonthName } from '@/lib/utils';
import { recordPaymentAction } from '@/actions/payment.actions';

export type PaymentMethodType = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

export interface FeeRecordPaymentTarget {
  id: string; // feeRecordId
  studentId: string;
  studentName: string;
  className?: string | null;
  billingMonth: number;
  billingYear: number;
  amountDue: number | string;
  totalPaid: number | string;
  outstanding: number | string;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeRecord: FeeRecordPaymentTarget | null;
  onPaymentSuccess: (result?: unknown) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  feeRecord,
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentOutstanding = feeRecord ? Math.max(0, Number(feeRecord.outstanding)) : 0;
  const parsedAmount = parseFloat(amount) || 0;
  const newOutstanding = Math.max(0, currentOutstanding - parsedAmount);

  useEffect(() => {
    if (feeRecord && isOpen) {
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      setNotes('');
      setErrorMessage('');
    }
  }, [feeRecord, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !feeRecord) return null;

  const handlePayFull = () => {
    setAmount(currentOutstanding.toString());
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (parsedAmount <= 0) {
      setErrorMessage('Payment amount must be greater than ₹0');
      return;
    }

    if (parsedAmount > currentOutstanding) {
      setErrorMessage(
        `Overpayment rejected: payment amount ₹${parsedAmount.toLocaleString('en-IN')} exceeds outstanding balance of ${formatINR(currentOutstanding)}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const methodMap: Record<string, string> = {
        CASH: 'Cash',
        UPI: 'UPI',
        BANK_TRANSFER: 'Bank Transfer',
        OTHER: 'Other',
      };
      const result = await recordPaymentAction({
        feeRecordId: feeRecord.id,
        studentId: feeRecord.studentId,
        studentName: feeRecord.studentName,
        amount: parsedAmount,
        paymentDate,
        paymentMethod: (methodMap[paymentMethod] || 'Cash') as any,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to record payment');
        setIsSubmitting(false);
        return;
      }

      onPaymentSuccess(result.data);
      onClose();
    } catch {
      setErrorMessage('An unexpected server error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/80 flex items-center justify-center font-bold text-base shadow-inner">
              {feeRecord.studentName.charAt(0)}
            </div>
            <div>
              <h3 id="record-payment-title" className="font-bold text-lg leading-tight">
                {feeRecord.studentName}
              </h3>
              <p className="text-xs text-emerald-100">
                {feeRecord.className || 'Individual'} · {formatMonthName(feeRecord.billingMonth)}{' '}
                {feeRecord.billingYear} Fee
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Summary Strip */}
        <div className="bg-emerald-50/70 border-b border-emerald-100/60 p-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Billing Period</span>
            <span className="text-slate-800 font-bold">
              {formatMonthName(feeRecord.billingMonth)} {feeRecord.billingYear}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Fee Due</span>
              <span className="text-sm font-bold text-slate-800">
                {formatINR(Number(feeRecord.amountDue))}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Paid</span>
              <span className="text-sm font-bold text-emerald-600">
                {formatINR(Number(feeRecord.totalPaid))}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs bg-emerald-50/30">
              <span className="text-[11px] text-emerald-700 block font-bold">Outstanding</span>
              <span className="text-sm font-extrabold text-red-600">
                {formatINR(currentOutstanding)}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="payment-amount" className="block text-xs font-bold text-slate-700">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              {currentOutstanding > 0 && (
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Pay Full {formatINR(currentOutstanding)}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                ₹
              </span>
              <input
                id="payment-amount"
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                placeholder={currentOutstanding.toString()}
              />
            </div>
            {parsedAmount > 0 && parsedAmount < currentOutstanding && (
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                Partial Payment: ₹{newOutstanding.toLocaleString('en-IN')} will remain outstanding
              </p>
            )}
            {parsedAmount === currentOutstanding && currentOutstanding > 0 && (
              <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Full fee clearance
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="payment-date" className="block text-xs font-bold text-slate-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                id="payment-date"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
              />
            </div>

            <div>
              <label
                htmlFor="payment-method"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="payment-notes" className="block text-xs font-bold text-slate-700 mb-1">
              Note (Optional)
            </label>
            <input
              id="payment-notes"
              type="text"
              maxLength={250}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid by father, advance adjustment"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50 active:bg-slate-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
