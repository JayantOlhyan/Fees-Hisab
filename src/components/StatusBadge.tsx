import React from 'react';
import { FeeStatus } from '@/types';
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';

interface StatusBadgeProps {
  status: FeeStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const iconSize = isSm ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (status) {
    case 'PAID':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}
        >
          <CheckCircle2 className={`${iconSize} text-emerald-600`} />
          <span>Paid</span>
        </span>
      );

    case 'PARTIALLY_PAID':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 ${sizeClasses}`}
        >
          <Clock className={`${iconSize} text-amber-600`} />
          <span>Partial</span>
        </span>
      );

    case 'OVERDUE':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-red-50 text-red-700 border border-red-200/80 ${sizeClasses}`}
        >
          <AlertCircle className={`${iconSize} text-red-600`} />
          <span>Overdue</span>
        </span>
      );

    case 'DUE':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 ${sizeClasses}`}
        >
          <AlertTriangle className={`${iconSize} text-orange-600`} />
          <span>Due Today</span>
        </span>
      );

    case 'UPCOMING':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-slate-50 text-slate-600 border border-slate-200/80 ${sizeClasses}`}
        >
          <Calendar className={`${iconSize} text-slate-400`} />
          <span>Upcoming</span>
        </span>
      );
  }
};
