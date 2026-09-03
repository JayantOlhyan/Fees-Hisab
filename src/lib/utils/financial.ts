import { Decimal } from '@prisma/client/runtime/library';
import { FeeStatus } from '@/types';

export type MonetaryInput = number | string | Decimal;

export function toDecimal(value: MonetaryInput): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Invalid monetary value: number must be finite');
    }
    return new Decimal(value.toFixed(2));
  }
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!cleaned || isNaN(Number(cleaned))) {
      throw new Error(`Invalid monetary string: ${value}`);
    }
    return new Decimal(cleaned);
  }
  throw new Error('Unsupported monetary value');
}

/**
 * Calculates deterministic calendar fee due date clamping to last valid day of month.
 * e.g., 31 January -> 31 Jan, 31 February 2026 -> 28 Feb 2026, 31 February 2024 -> 29 Feb 2024
 */
export function calculateDueDate(year: number, month: number, feeDueDay: number): Date {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month ${month}. Must be between 1 and 12`);
  }
  if (feeDueDay < 1 || feeDueDay > 31) {
    throw new Error(`Invalid fee due day ${feeDueDay}. Must be between 1 and 31`);
  }

  // Determine last day of the given month (day 0 of month + 1)
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const clampedDay = Math.min(feeDueDay, lastDayOfMonth);

  // Return date in UTC YYYY-MM-DD
  return new Date(Date.UTC(year, month - 1, clampedDay));
}

/**
 * Computes deterministic fee status according to authoritative PRD rules:
 * 1. totalPaid >= amountDue -> PAID
 * 2. totalPaid > 0 -> PARTIALLY_PAID
 * 3. currentDate > dueDate -> OVERDUE
 * 4. currentDate >= dueDate (same date) -> DUE
 * 5. otherwise -> UPCOMING
 */
export function calculateFeeStatus(params: {
  amountDue: MonetaryInput;
  totalPaid: MonetaryInput;
  dueDate: Date | string;
  currentDate?: Date | string;
}): FeeStatus {
  const due = toDecimal(params.amountDue);
  const paid = toDecimal(params.totalPaid);

  if (paid.greaterThanOrEqualTo(due)) {
    return 'PAID';
  }

  if (paid.greaterThan(0)) {
    return 'PARTIALLY_PAID';
  }

  const dueD = typeof params.dueDate === 'string' ? new Date(params.dueDate) : params.dueDate;
  const currD = params.currentDate
    ? typeof params.currentDate === 'string'
      ? new Date(params.currentDate)
      : params.currentDate
    : new Date();

  // Normalize to YYYY-MM-DD string comparisons to prevent timezone shifting
  const dueStr = dueD.toISOString().split('T')[0];
  const currStr = currD.toISOString().split('T')[0];

  if (currStr > dueStr) {
    return 'OVERDUE';
  }

  if (currStr === dueStr) {
    return 'DUE';
  }

  return 'UPCOMING';
}

/**
 * Calculates outstanding balance = amountDue - totalPaid
 * Guarantees no negative balance.
 */
export function calculateOutstanding(amountDue: MonetaryInput, totalPaid: MonetaryInput): Decimal {
  const due = toDecimal(amountDue);
  const paid = toDecimal(totalPaid);
  const diff = due.minus(paid);
  return diff.greaterThan(0) ? diff : new Decimal(0);
}
