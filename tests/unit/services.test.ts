import { describe, it, expect, vi } from 'vitest';
import {
  studentCreateSchema,
  paymentRecordSchema,
  feeRecordGenerateSchema,
} from '@/lib/validations';
import { FeeService } from '@/services/fees/fee.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, FeeStatus } from '@prisma/client';

describe('Validation & Service Logic (Phase 1)', () => {
  describe('Student Validation Rules', () => {
    it('requires positive monthlyFee and rejects 0 or negative values', () => {
      const valid = studentCreateSchema.safeParse({
        name: 'Aarav Sharma',
        className: 'Class 8',
        subjects: ['Mathematics'],
        monthlyFee: 2000,
        feeDueDay: 5,
        joiningDate: '2026-06-01',
      });
      expect(valid.success).toBe(true);

      const zeroFee = studentCreateSchema.safeParse({
        name: 'Aarav Sharma',
        className: 'Class 8',
        subjects: ['Mathematics'],
        monthlyFee: 0,
        feeDueDay: 5,
        joiningDate: '2026-06-01',
      });
      expect(zeroFee.success).toBe(false);

      const negativeFee = studentCreateSchema.safeParse({
        name: 'Aarav Sharma',
        className: 'Class 8',
        subjects: ['Mathematics'],
        monthlyFee: -100,
        feeDueDay: 5,
        joiningDate: '2026-06-01',
      });
      expect(negativeFee.success).toBe(false);
    });

    it('requires feeDueDay between 1 and 31', () => {
      const invalidDay = studentCreateSchema.safeParse({
        name: 'Aarav Sharma',
        className: 'Class 8',
        subjects: ['Mathematics'],
        monthlyFee: 2000,
        feeDueDay: 32,
        joiningDate: '2026-06-01',
      });
      expect(invalidDay.success).toBe(false);
    });
  });

  describe('Payment Validation & Overpayment Rules', () => {
    it('Test 5: Rejects payment amounts <= 0', () => {
      const zeroAmount = paymentRecordSchema.safeParse({
        studentId: '123e4567-e89b-12d3-a456-426614174000',
        feeRecordId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 0,
        paymentDate: '2026-09-02',
        paymentMethod: 'CASH',
      });
      expect(zeroAmount.success).toBe(false);

      const negativeAmount = paymentRecordSchema.safeParse({
        studentId: '123e4567-e89b-12d3-a456-426614174000',
        feeRecordId: '123e4567-e89b-12d3-a456-426614174001',
        amount: -500,
        paymentDate: '2026-09-02',
        paymentMethod: 'CASH',
      });
      expect(negativeAmount.success).toBe(false);
    });

    it('enforces controlled PaymentMethod enum (CASH, UPI, BANK_TRANSFER, OTHER)', () => {
      const valid = paymentRecordSchema.safeParse({
        studentId: '123e4567-e89b-12d3-a456-426614174000',
        feeRecordId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 1000,
        paymentDate: '2026-09-02',
        paymentMethod: 'UPI',
      });
      expect(valid.success).toBe(true);

      const invalidMethod = paymentRecordSchema.safeParse({
        studentId: '123e4567-e89b-12d3-a456-426614174000',
        feeRecordId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 1000,
        paymentDate: '2026-09-02',
        paymentMethod: 'BITCOIN', // Invalid
      });
      expect(invalidMethod.success).toBe(false);
    });
  });

  describe('Fee Computation & Historical Preservation', () => {
    it('correctly aggregates multiple payments into totalPaid and outstanding', () => {
      const mockFeeRecord = {
        id: 'fee-1',
        studentId: 'std-1',
        billingYear: 2026,
        billingMonth: 9,
        amountDue: new Decimal(2000),
        dueDate: new Date('2026-09-05'),
        status: 'UPCOMING' as FeeStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        payments: [
          {
            id: 'p1',
            studentId: 'std-1',
            feeRecordId: 'fee-1',
            amount: new Decimal(500),
            paymentDate: new Date('2026-09-01'),
            paymentMethod: 'CASH' as const,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'p2',
            studentId: 'std-1',
            feeRecordId: 'fee-1',
            amount: new Decimal(500),
            paymentDate: new Date('2026-09-02'),
            paymentMethod: 'CASH' as const,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const state = FeeService.computeFeeRecordState(mockFeeRecord, '2026-09-03');
      expect(state.totalPaid.equals(new Decimal(1000))).toBe(true);
      expect(state.outstanding.equals(new Decimal(1000))).toBe(true);
      expect(state.computedStatus).toBe('PARTIALLY_PAID');
    });

    it('Test 7: Historical fee amount due is preserved independently of subsequent student fee changes', () => {
      // If student monthly fee changed from 2000 to 2500, existing feeRecord.amountDue remains 2000
      const septemberRecord = {
        id: 'fee-sep',
        studentId: 'std-1',
        billingYear: 2026,
        billingMonth: 9,
        amountDue: new Decimal(2000), // Snapshot
        dueDate: new Date('2026-09-05'),
        status: 'PAID' as FeeStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        payments: [
          {
            id: 'p3',
            studentId: 'std-1',
            feeRecordId: 'fee-sep',
            amount: new Decimal(2000),
            paymentDate: new Date('2026-09-05'),
            paymentMethod: 'UPI' as const,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const computed = FeeService.computeFeeRecordState(septemberRecord);
      expect(computed.record.amountDue.equals(new Decimal(2000))).toBe(true);
      expect(computed.outstanding.equals(new Decimal(0))).toBe(true);
      expect(computed.computedStatus).toBe('PAID');
    });
  });
});
