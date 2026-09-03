'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { FeeRecord, Student, PaymentMethod } from '@/types';
import { formatINR, formatMonthName } from '@/lib/utils';
import { recordPayment } from '@/lib/storage';
import confetti from 'canvas-confetti';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeRecord: FeeRecord | null;
  student: Student | null;
  onPaymentSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  feeRecord,
  student,
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (feeRecord && isOpen) {
      const outstanding = Math.max(0, feeRecord.amountDue - feeRecord.amountPaid);
      setAmount(outstanding.toString());
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Cash');
      setNotes('');
      setErrorMessage('');
    }
  }, [feeRecord, isOpen]);

  if (!isOpen || !feeRecord || !student) return null;

  const currentOutstanding = Math.max(0, feeRecord.amountDue - feeRecord.amountPaid);
  const parsedAmount = parseFloat(amount) || 0;
  const newOutstanding = Math.max(0, currentOutstanding - parsedAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0');
      return;
    }
    if (parsedAmount > currentOutstanding) {
      setErrorMessage(
        `Amount cannot exceed outstanding amount of ${formatINR(currentOutstanding)}`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      recordPayment({
        feeRecordId: feeRecord.id,
        studentId: student.id,
        amount: parsedAmount,
        paymentDate,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      // Confetti celebratory effect
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // silent fail if confetti fails in some env
      }

      onPaymentSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to record payment');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/80 flex items-center justify-center font-bold text-base shadow-inner">
              {student.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{student.name}</h3>
              <p className="text-xs text-emerald-100">
                {student.class}{' '}
                {student.subjects.length > 0 ? `· ${student.subjects.join(', ')}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Summary Strip */}
        <div className="bg-emerald-50/70 border-b border-emerald-100/60 p-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Billing Month</span>
            <span className="text-slate-800 font-bold">
              {formatMonthName(feeRecord.billingMonth)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Amount Due</span>
              <span className="text-sm font-bold text-slate-800">
                {formatINR(feeRecord.amountDue)}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Already Paid</span>
              <span className="text-sm font-bold text-emerald-600">
                {formatINR(feeRecord.amountPaid)}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs bg-emerald-50/30">
              <span className="text-[11px] text-emerald-700 block font-medium">Outstanding</span>
              <span className="text-sm font-extrabold text-red-600">
                {formatINR(currentOutstanding)}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount Paid (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                placeholder="2000"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Note (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via father's UPI, or balance next week"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 transition flex items-center justify-center gap-2"
            >
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
