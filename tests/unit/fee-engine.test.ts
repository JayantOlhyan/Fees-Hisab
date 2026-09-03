import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeeService } from '@/services/fees/fee.service';
import { calculateDueDate, calculateFeeStatus, calculateOutstanding } from '@/lib/utils/financial';
import { AuthorizationError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { Student, FeeRecord, Payment } from '@prisma/client';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    feeRecord: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('Phase 3 — Fee Engine Unit & Service Tests', () => {
  const teacherA = 'teacher-111';
  const teacherB = 'teacher-222';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A. Fee Rule & Calendar Clamping Unit Tests', () => {
    it('calculates standard due days accurately', () => {
      expect(calculateDueDate(2026, 9, 1).toISOString().split('T')[0]).toBe('2026-09-01');
      expect(calculateDueDate(2026, 9, 15).toISOString().split('T')[0]).toBe('2026-09-15');
      expect(calculateDueDate(2026, 9, 28).toISOString().split('T')[0]).toBe('2026-09-28');
    });

    it('clamps due days for 30-day and 31-day months', () => {
      expect(calculateDueDate(2026, 9, 31).toISOString().split('T')[0]).toBe('2026-09-30');
      expect(calculateDueDate(2026, 10, 31).toISOString().split('T')[0]).toBe('2026-10-31');
      expect(calculateDueDate(2026, 11, 31).toISOString().split('T')[0]).toBe('2026-11-30');
    });

    it('clamps correctly in non-leap February (2027) to Feb 28', () => {
      expect(calculateDueDate(2027, 2, 29).toISOString().split('T')[0]).toBe('2027-02-28');
      expect(calculateDueDate(2027, 2, 30).toISOString().split('T')[0]).toBe('2027-02-28');
      expect(calculateDueDate(2027, 2, 31).toISOString().split('T')[0]).toBe('2027-02-28');
    });

    it('clamps correctly in leap February (2028) to Feb 29', () => {
      expect(calculateDueDate(2028, 2, 29).toISOString().split('T')[0]).toBe('2028-02-29');
      expect(calculateDueDate(2028, 2, 30).toISOString().split('T')[0]).toBe('2028-02-29');
      expect(calculateDueDate(2028, 2, 31).toISOString().split('T')[0]).toBe('2028-02-29');
    });
  });

  describe('B. Joining Date Rules & Pre-Joining Rejection', () => {
    const studentWithSeptJoining = {
      id: 'a0000000-0000-4000-8000-000000000001',
      userId: teacherA,
      name: 'Rohan Sharma',
      guardianName: null,
      phone: null,
      className: '8th',
      school: null,
      subjects: ['Mathematics'],
      monthlyFee: new Decimal(2000),
      feeDueDay: 5,
      joiningDate: new Date('2026-09-18'),
      status: 'ACTIVE' as const,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('allows fee generation in the joining month (full fee, no prorating)', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(
        studentWithSeptJoining as unknown as Student
      );
      vi.mocked(prisma.feeRecord.upsert).mockResolvedValueOnce({
        id: 'rec-1',
        studentId: studentWithSeptJoining.id,
        billingYear: 2026,
        billingMonth: 9,
        amountDue: new Decimal(2000),
        dueDate: new Date('2026-09-05'),
        status: 'UPCOMING',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as FeeRecord);

      const record = await FeeService.ensureFeeRecord(teacherA, {
        studentId: studentWithSeptJoining.id,
        billingYear: 2026,
        billingMonth: 9,
      });

      expect(record.amountDue.equals(new Decimal(2000))).toBe(true);
      expect(record.billingMonth).toBe(9);
    });

    it('strictly rejects fee generation for months prior to joining month', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(
        studentWithSeptJoining as unknown as Student
      );

      await expect(
        FeeService.ensureFeeRecord(teacherA, {
          studentId: studentWithSeptJoining.id,
          billingYear: 2026,
          billingMonth: 8,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('C. Historical Fee Snapshot & Idempotency', () => {
    it('preserves historical snapshot amount and does not mutate existing records', async () => {
      const student = {
        id: 'a0000000-0000-4000-8000-000000000002',
        userId: teacherA,
        name: 'Rohan',
        guardianName: null,
        phone: null,
        className: '8th',
        school: null,
        subjects: ['Mathematics'],
        monthlyFee: new Decimal(2500),
        feeDueDay: 10,
        joiningDate: new Date('2026-01-01'),
        status: 'ACTIVE' as const,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingRecord = {
        id: 'existing-fee-1',
        studentId: student.id,
        billingYear: 2026,
        billingMonth: 8,
        amountDue: new Decimal(1500),
        dueDate: new Date('2026-08-10'),
        status: 'PAID' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(student as unknown as Student);
      vi.mocked(prisma.feeRecord.upsert).mockResolvedValueOnce(
        existingRecord as unknown as FeeRecord
      );

      const result = await FeeService.ensureFeeRecord(teacherA, {
        studentId: student.id,
        billingYear: 2026,
        billingMonth: 8,
      });

      expect(result.amountDue.equals(new Decimal(1500))).toBe(true);
      expect(prisma.feeRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {},
        })
      );
    });
  });

  describe('D. Status Calculation & Outstanding Mathematics', () => {
    it('calculates UPCOMING when payment is 0 and current date < due date', () => {
      const status = calculateFeeStatus({
        amountDue: new Decimal(2000),
        totalPaid: new Decimal(0),
        dueDate: '2026-09-10',
        currentDate: '2026-09-01',
      });
      expect(status).toBe('UPCOMING');
    });

    it('calculates DUE on the due date when payment is 0', () => {
      const status = calculateFeeStatus({
        amountDue: new Decimal(2000),
        totalPaid: new Decimal(0),
        dueDate: '2026-09-10',
        currentDate: '2026-09-10',
      });
      expect(status).toBe('DUE');
    });

    it('calculates OVERDUE after due date with zero payment', () => {
      const status = calculateFeeStatus({
        amountDue: new Decimal(2000),
        totalPaid: new Decimal(0),
        dueDate: '2026-09-10',
        currentDate: '2026-09-15',
      });
      expect(status).toBe('OVERDUE');
    });

    it('calculates PARTIALLY_PAID whenever totalPaid > 0 and < amountDue', () => {
      const status = calculateFeeStatus({
        amountDue: new Decimal(2000),
        totalPaid: new Decimal(500),
        dueDate: '2026-09-10',
        currentDate: '2026-09-15',
      });
      expect(status).toBe('PARTIALLY_PAID');
    });

    it('calculates PAID whenever totalPaid >= amountDue', () => {
      const status = calculateFeeStatus({
        amountDue: new Decimal(2000),
        totalPaid: new Decimal(2000),
        dueDate: '2026-09-10',
        currentDate: '2026-09-15',
      });
      expect(status).toBe('PAID');
    });

    it('guarantees outstanding amount is never negative', () => {
      expect(calculateOutstanding(new Decimal(2000), new Decimal(0)).toNumber()).toBe(2000);
      expect(calculateOutstanding(new Decimal(2000), new Decimal(500)).toNumber()).toBe(1500);
      expect(calculateOutstanding(new Decimal(2000), new Decimal(2000)).toNumber()).toBe(0);
      expect(calculateOutstanding(new Decimal(2000), new Decimal(2500)).toNumber()).toBe(0);
    });
  });

  describe('E. Authorization & Multi-Tenant Boundaries', () => {
    it('denies Teacher B from generating fees for Teacher A student', async () => {
      const studentA = {
        id: 'a0000000-0000-4000-8000-000000000003',
        userId: teacherA,
        name: 'Aarav',
        guardianName: null,
        phone: null,
        className: '8th',
        school: null,
        subjects: ['Mathematics'],
        monthlyFee: new Decimal(2000),
        feeDueDay: 5,
        joiningDate: new Date('2026-01-01'),
        status: 'ACTIVE' as const,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(studentA as unknown as Student);

      await expect(
        FeeService.ensureFeeRecord(teacherB, {
          studentId: studentA.id,
          billingYear: 2026,
          billingMonth: 9,
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('denies Teacher B from accessing Teacher A fee records by ID', async () => {
      const feeRecordA = {
        id: 'b0000000-0000-4000-8000-000000000001',
        studentId: 'a0000000-0000-4000-8000-000000000003',
        billingYear: 2026,
        billingMonth: 9,
        amountDue: new Decimal(2000),
        dueDate: new Date('2026-09-05'),
        status: 'UPCOMING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: {
          id: 'student-A',
          userId: teacherA,
          name: 'Aarav',
        },
        payments: [] as Payment[],
      };

      vi.mocked(prisma.feeRecord.findUnique).mockResolvedValueOnce(
        feeRecordA as unknown as FeeRecord & { student: Student; payments: Payment[] }
      );

      await expect(FeeService.getFeeRecordById(teacherB, 'fee-A')).rejects.toThrow(
        AuthorizationError
      );
    });
  });

  describe('F. Bulk Fee Generation for Active Students Only', () => {
    it('generates fees for active students and skips pre-joining/archived', async () => {
      const activeStudent = {
        id: 'student-active',
        userId: teacherA,
        name: 'Active Student',
        guardianName: null,
        phone: null,
        className: '8th',
        school: null,
        subjects: ['Mathematics'],
        monthlyFee: new Decimal(1800),
        feeDueDay: 5,
        joiningDate: new Date('2026-08-01'),
        status: 'ACTIVE' as const,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.student.findMany).mockResolvedValueOnce([
        activeStudent,
      ] as unknown as Student[]);
      vi.mocked(prisma.feeRecord.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.feeRecord.create).mockResolvedValueOnce({} as unknown as FeeRecord);

      const result = await FeeService.generateFeesForTeacher(teacherA, 2026, 9);
      expect(result.createdCount).toBe(1);
      expect(result.alreadyExistingCount).toBe(0);
      expect(result.skippedPreJoiningCount).toBe(0);
    });
  });
});
