import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentRecordSchema } from '@/lib/validations';
import { PaymentService } from '@/services/payments/payment.service';
import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { ValidationError, AuthorizationError } from '@/lib/errors';
import { FeeStatus, PaymentMethod, FeeRecord, Payment, Student } from '@prisma/client';

// Mock prisma for isolated service unit tests
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');
  return {
    ...actual,
    PaymentMethod: {
      CASH: 'CASH',
      UPI: 'UPI',
      BANK_TRANSFER: 'BANK_TRANSFER',
      OTHER: 'OTHER',
    },
    FeeStatus: {
      UPCOMING: 'UPCOMING',
      DUE: 'DUE',
      PARTIALLY_PAID: 'PARTIALLY_PAID',
      PAID: 'PAID',
      OVERDUE: 'OVERDUE',
    },
  };
});

interface MockFeeRecordWithRelations extends FeeRecord {
  student: Student;
  payments: Payment[];
}

describe('Phase 4 — Payment Engine Unit & Domain Tests', () => {
  const teacherA = 'teacher-uuid-1111-2222-333333333333';
  const teacherB = 'teacher-uuid-9999-8888-777777777777';
  const studentA = '123e4567-e89b-12d3-a456-426614174000';
  const feeRecordA = '123e4567-e89b-12d3-a456-426614174001';

  describe('1. Payment Input Validation (Zod)', () => {
    it('accepts valid payment payload', () => {
      const valid = paymentRecordSchema.safeParse({
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 1500,
        paymentDate: '2026-09-03',
        paymentMethod: 'CASH',
        notes: 'September tuition fee',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects payment amount = 0', () => {
      const res = paymentRecordSchema.safeParse({
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 0,
        paymentDate: '2026-09-03',
        paymentMethod: 'CASH',
      });
      expect(res.success).toBe(false);
    });

    it('rejects negative payment amount', () => {
      const res = paymentRecordSchema.safeParse({
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: -500,
        paymentDate: '2026-09-03',
        paymentMethod: 'CASH',
      });
      expect(res.success).toBe(false);
    });

    it('rejects invalid date format (non-YYYY-MM-DD)', () => {
      const res = paymentRecordSchema.safeParse({
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 1000,
        paymentDate: '03/09/2026', // invalid format
        paymentMethod: 'UPI',
      });
      expect(res.success).toBe(false);
    });

    it('rejects invalid payment method enum', () => {
      const res = paymentRecordSchema.safeParse({
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 1000,
        paymentDate: '2026-09-03',
        paymentMethod: 'CRYPTO' as unknown as PaymentMethod,
      });
      expect(res.success).toBe(false);
    });

    it('rejects notes exceeding 250 characters', () => {
      const res = paymentRecordSchema.safeParse({
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 1000,
        paymentDate: '2026-09-03',
        paymentMethod: 'CASH',
        notes: 'A'.repeat(251),
      });
      expect(res.success).toBe(false);
    });

    it('rejects non-UUID studentId or feeRecordId', () => {
      const res = paymentRecordSchema.safeParse({
        studentId: 'not-a-uuid',
        feeRecordId: feeRecordA,
        amount: 1000,
        paymentDate: '2026-09-03',
        paymentMethod: 'CASH',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('2. Financial Accounting & Status Transitions', () => {
    let mockFeeRecord: MockFeeRecordWithRelations;

    beforeEach(() => {
      mockFeeRecord = {
        id: feeRecordA,
        studentId: studentA,
        billingYear: 2026,
        billingMonth: 9,
        amountDue: new Decimal(2000),
        dueDate: new Date('2026-09-05'),
        status: 'UPCOMING' as FeeStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: {
          id: studentA,
          userId: teacherA,
          name: 'Aarav Sharma',
          guardianName: null,
          phone: null,
          className: '10th',
          school: null,
          subjects: ['Mathematics'],
          joiningDate: new Date('2026-06-01'),
          monthlyFee: new Decimal(2000),
          feeDueDay: 5,
          status: 'ACTIVE',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        payments: [],
      };

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        feeRecord: {
          findUnique: vi.fn().mockImplementation(() => Promise.resolve(mockFeeRecord)),
          update: vi.fn().mockImplementation(({ data }: { data: { status: FeeStatus } }) => {
            mockFeeRecord.status = data.status;
            return Promise.resolve(mockFeeRecord);
          }),
        },
        payment: {
          create: vi
            .fn()
            .mockImplementation(
              ({ data }: { data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> }) => {
                const created: Payment = {
                  id: 'payment-uuid-1',
                  ...data,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                mockFeeRecord.payments.push(created);
                return Promise.resolve(created);
              }
            ),
        },
      };

      vi.spyOn(prisma, '$transaction').mockImplementation((callback) =>
        (callback as (tx: unknown) => Promise<unknown>)(mockTx)
      );
    });

    it('Partial payment: Fee ₹2,000, Pay ₹500 -> Paid ₹500, Outstanding ₹1,500, Status PARTIALLY_PAID', async () => {
      const result = await PaymentService.recordPayment(teacherA, {
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 500,
        paymentDate: '2026-09-01',
        paymentMethod: 'CASH',
      });

      expect(result.totalPaid.toNumber()).toBe(500);
      expect(result.outstanding.toNumber()).toBe(1500);
      expect(result.feeRecord.status).toBe('PARTIALLY_PAID');
      expect(mockFeeRecord.payments).toHaveLength(1);
    });

    it('Full payment: Fee ₹2,000, Pay ₹2,000 -> Paid ₹2,000, Outstanding ₹0, Status PAID', async () => {
      const result = await PaymentService.recordPayment(teacherA, {
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 2000,
        paymentDate: '2026-09-02',
        paymentMethod: 'UPI',
      });

      expect(result.totalPaid.toNumber()).toBe(2000);
      expect(result.outstanding.toNumber()).toBe(0);
      expect(result.feeRecord.status).toBe('PAID');
    });

    it('Multiple payments: Pay ₹500 then ₹800 then ₹700 -> creates 3 distinct transactions and marks PAID', async () => {
      // 1st Payment
      await PaymentService.recordPayment(teacherA, {
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 500,
        paymentDate: '2026-09-01',
        paymentMethod: 'CASH',
      });

      // 2nd Payment
      await PaymentService.recordPayment(teacherA, {
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 800,
        paymentDate: '2026-09-02',
        paymentMethod: 'UPI',
      });

      // 3rd Payment (Full clearance)
      const finalResult = await PaymentService.recordPayment(teacherA, {
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 700,
        paymentDate: '2026-09-03',
        paymentMethod: 'BANK_TRANSFER',
      });

      expect(mockFeeRecord.payments).toHaveLength(3);
      expect(finalResult.totalPaid.toNumber()).toBe(2000);
      expect(finalResult.outstanding.toNumber()).toBe(0);
      expect(finalResult.feeRecord.status).toBe('PAID');
    });

    it('Overpayment rejection: Fee ₹2,000, Paid ₹1,500, attempt ₹600 -> REJECTED, database unchanged', async () => {
      // Existing ₹1,500 payment
      mockFeeRecord.payments.push({
        id: 'p-existing',
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: new Decimal(1500),
        paymentDate: new Date('2026-09-01'),
        paymentMethod: 'CASH',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        PaymentService.recordPayment(teacherA, {
          studentId: studentA,
          feeRecordId: feeRecordA,
          amount: 600, // Exceeds outstanding (₹500)
          paymentDate: '2026-09-02',
          paymentMethod: 'UPI',
        })
      ).rejects.toThrow(ValidationError);

      // Verify no payment created
      expect(mockFeeRecord.payments).toHaveLength(1);
    });

    it('Immutability: new payments do not alter amounts or dates of historical transactions', async () => {
      const p1: Payment = {
        id: 'p-1',
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: new Decimal(1000),
        paymentDate: new Date('2026-09-01'),
        paymentMethod: 'CASH',
        notes: 'First installment',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFeeRecord.payments.push(p1);

      await PaymentService.recordPayment(teacherA, {
        studentId: studentA,
        feeRecordId: feeRecordA,
        amount: 500,
        paymentDate: '2026-09-03',
        paymentMethod: 'UPI',
        notes: 'Second installment',
      });

      // P1 remains exactly identical
      expect(mockFeeRecord.payments[0].amount.toNumber()).toBe(1000);
      expect(mockFeeRecord.payments[0].notes).toBe('First installment');
      expect(mockFeeRecord.payments).toHaveLength(2);
    });

    it('Cross-tenant authorization: Teacher B cannot record payment on Teacher A student fee record', async () => {
      await expect(
        PaymentService.recordPayment(teacherB, {
          studentId: studentA,
          feeRecordId: feeRecordA,
          amount: 500,
          paymentDate: '2026-09-01',
          paymentMethod: 'CASH',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('Rejects payment when studentId does not match feeRecord studentId', async () => {
      await expect(
        PaymentService.recordPayment(teacherA, {
          studentId: '123e4567-e89b-12d3-a456-426614174999', // mismatched
          feeRecordId: feeRecordA,
          amount: 500,
          paymentDate: '2026-09-01',
          paymentMethod: 'CASH',
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
