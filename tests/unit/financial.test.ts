import { describe, it, expect } from 'vitest';
import {
  toDecimal,
  calculateDueDate,
  calculateFeeStatus,
  calculateOutstanding,
} from '@/lib/utils/financial';
import { Decimal } from '@prisma/client/runtime/library';

describe('Financial Accounting & Calculations (Phase 1)', () => {
  describe('Precision & Decimal Representation', () => {
    it('handles precise monetary values without floating point errors', () => {
      const dec1 = toDecimal(0.1);
      const dec2 = toDecimal(0.2);
      expect(dec1.plus(dec2).equals(toDecimal('0.30'))).toBe(true);

      const fee = toDecimal(2000);
      const p1 = toDecimal(666.67);
      const p2 = toDecimal(333.33);
      const remaining = fee.minus(p1).minus(p2);
      expect(remaining.equals(toDecimal(1000))).toBe(true);
    });

    it('rejects invalid or non-finite inputs', () => {
      expect(() => toDecimal(NaN)).toThrow();
      expect(() => toDecimal(Infinity)).toThrow();
      expect(() => toDecimal('abc')).toThrow();
    });
  });

  describe('Fee Due Date Clamping', () => {
    it('clamps 31st January to 31 Jan', () => {
      const d = calculateDueDate(2026, 1, 31);
      expect(d.toISOString().split('T')[0]).toBe('2026-01-31');
    });

    it('clamps 31st February in non-leap year (2026) to 28 Feb', () => {
      const d = calculateDueDate(2026, 2, 31);
      expect(d.toISOString().split('T')[0]).toBe('2026-02-28');
    });

    it('clamps 31st February in leap year (2024) to 29 Feb', () => {
      const d = calculateDueDate(2024, 2, 31);
      expect(d.toISOString().split('T')[0]).toBe('2024-02-29');
    });

    it('clamps 31st April to 30 Apr', () => {
      const d = calculateDueDate(2026, 4, 31);
      expect(d.toISOString().split('T')[0]).toBe('2026-04-30');
    });

    it('clamps 31st June to 30 Jun', () => {
      const d = calculateDueDate(2026, 6, 31);
      expect(d.toISOString().split('T')[0]).toBe('2026-06-30');
    });
  });

  describe('Critical Mandatory Business Rule Tests', () => {
    // Test 1: Full Payment
    it('Test 1: Full payment of ₹2,000 sets Outstanding to ₹0 and Status to PAID', () => {
      const outstanding = calculateOutstanding(2000, 2000);
      expect(outstanding.equals(new Decimal(0))).toBe(true);

      const status = calculateFeeStatus({
        amountDue: 2000,
        totalPaid: 2000,
        dueDate: '2026-09-05',
        currentDate: '2026-09-10', // even if past due, paid in full is PAID
      });
      expect(status).toBe('PAID');
    });

    // Test 2: Partial Payment
    it('Test 2: Partial payment of ₹500 against ₹2,000 results in Outstanding ₹1,500 and PARTIALLY_PAID', () => {
      const outstanding = calculateOutstanding(2000, 500);
      expect(outstanding.equals(new Decimal(1500))).toBe(true);

      const status = calculateFeeStatus({
        amountDue: 2000,
        totalPaid: 500,
        dueDate: '2026-09-05',
        currentDate: '2026-09-03',
      });
      expect(status).toBe('PARTIALLY_PAID');
    });

    // Test 3: Overdue Fee (no payment, due date passed)
    it('Test 3: Fee ₹2,000 with ₹0 paid and past due date results in Outstanding ₹2,000 and OVERDUE', () => {
      const outstanding = calculateOutstanding(2000, 0);
      expect(outstanding.equals(new Decimal(2000))).toBe(true);

      const status = calculateFeeStatus({
        amountDue: 2000,
        totalPaid: 0,
        dueDate: '2026-09-01',
        currentDate: '2026-09-03',
      });
      expect(status).toBe('OVERDUE');
    });

    // Test 4: Upcoming Fee (no payment, due date is in the future)
    it('Test 4: Fee ₹2,000 with ₹0 paid and future due date results in UPCOMING', () => {
      const status = calculateFeeStatus({
        amountDue: 2000,
        totalPaid: 0,
        dueDate: '2026-09-10',
        currentDate: '2026-09-03',
      });
      expect(status).toBe('UPCOMING');
    });

    // Due Today
    it('Status is DUE when currentDate equals dueDate with ₹0 paid', () => {
      const status = calculateFeeStatus({
        amountDue: 2000,
        totalPaid: 0,
        dueDate: '2026-09-03',
        currentDate: '2026-09-03',
      });
      expect(status).toBe('DUE');
    });

    // Outstanding never negative
    it('Outstanding balance is never negative even if paid exceeds due', () => {
      const outstanding = calculateOutstanding(2000, 2500);
      expect(outstanding.equals(new Decimal(0))).toBe(true);
    });
  });
});
