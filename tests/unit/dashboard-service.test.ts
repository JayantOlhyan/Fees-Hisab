import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '@/services/dashboard/dashboard.service';
import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');
  return {
    ...actual,
    FeeStatus: {
      UPCOMING: 'UPCOMING',
      DUE: 'DUE',
      PARTIALLY_PAID: 'PARTIALLY_PAID',
      PAID: 'PAID',
      OVERDUE: 'OVERDUE',
    },
    PaymentMethod: {
      CASH: 'CASH',
      UPI: 'UPI',
      BANK_TRANSFER: 'BANK_TRANSFER',
      OTHER: 'OTHER',
    },
  };
});

describe('Phase 5 — DashboardService Unit & Domain Tests', () => {
  const teacherA = 'teacher-uuid-1111-2222-333333333333';
  const teacherB = 'teacher-uuid-9999-8888-777777777777';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Active Student Counting & Archival Isolation', () => {
    it('counts only ACTIVE students and excludes ARCHIVED students', async () => {
      vi.spyOn(prisma.student, 'count').mockResolvedValue(12);
      vi.spyOn(prisma.feeRecord, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([]);

      const summary = await DashboardService.getDashboardSummary(teacherA, 2026, 9);

      expect(summary.activeStudentsCount).toBe(12);
      expect(prisma.student.count).toHaveBeenCalledWith({
        where: { userId: teacherA, status: 'ACTIVE' },
      });
    });
  });

  describe('2. Financial Aggregation & Period Isolation', () => {
    it('aggregates collected, outstanding, and status counts for current period accurately', async () => {
      vi.spyOn(prisma.student, 'count').mockResolvedValue(4);

      const mockFeeRecords = [
        // Record 1: Fee ₹2,000, Paid ₹2,000 -> Status PAID, Outstanding 0
        {
          id: 'fee-1',
          studentId: 'std-1',
          billingYear: 2026,
          billingMonth: 9,
          amountDue: new Decimal(2000),
          dueDate: new Date('2026-09-05'),
          student: {
            id: 'std-1',
            name: 'Rahul Sharma',
            guardianName: 'Rajesh',
            phone: '9876543210',
            className: 'Class 8',
            status: 'ACTIVE' as const,
          },
          payments: [
            {
              id: 'p-1',
              amount: new Decimal(2000),
              paymentDate: new Date('2026-09-02'),
              paymentMethod: 'UPI' as const,
            },
          ],
        },
        // Record 2: Fee ₹1,500, Paid ₹500 -> Status PARTIALLY_PAID, Outstanding ₹1,000
        {
          id: 'fee-2',
          studentId: 'std-2',
          billingYear: 2026,
          billingMonth: 9,
          amountDue: new Decimal(1500),
          dueDate: new Date('2026-09-05'),
          student: {
            id: 'std-2',
            name: 'Priya Verma',
            guardianName: 'Rajesh',
            phone: '9876543211',
            className: 'Class 8',
            status: 'ACTIVE' as const,
          },
          payments: [
            {
              id: 'p-2',
              amount: new Decimal(500),
              paymentDate: new Date('2026-09-03'),
              paymentMethod: 'CASH' as const,
            },
          ],
        },
        // Record 3: Fee ₹1,800, Paid ₹0, Past due date -> Status OVERDUE, Outstanding ₹1,800
        {
          id: 'fee-3',
          studentId: 'std-3',
          billingYear: 2026,
          billingMonth: 9,
          amountDue: new Decimal(1800),
          dueDate: new Date('2026-09-01'), // past
          student: {
            id: 'std-3',
            name: 'Aarav Singh',
            guardianName: 'Amit',
            phone: '9876543212',
            className: 'Class 9',
            status: 'ACTIVE' as const,
          },
          payments: [],
        },
      ];

      vi.spyOn(prisma.feeRecord, 'findMany').mockResolvedValue(mockFeeRecords as never);
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([]);

      const summary = await DashboardService.getDashboardSummary(teacherA, 2026, 9);

      expect(summary.collectedThisMonth).toBe('2500');
      expect(summary.outstandingThisMonth).toBe('2800');
      expect(summary.paidCount).toBe(1);
      expect(summary.partiallyPaidCount).toBe(1);
      expect(summary.overdueCount).toBe(1);
      expect(summary.hasFeeRecords).toBe(true);
    });

    it('Period Isolation: September payments do not leak into October dashboard collection', async () => {
      vi.spyOn(prisma.student, 'count').mockResolvedValue(3);

      // Querying October 2026 (no October fee records yet)
      vi.spyOn(prisma.feeRecord, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([]);

      const summaryOct = await DashboardService.getDashboardSummary(teacherA, 2026, 10);

      expect(summaryOct.collectedThisMonth).toBe('0');
      expect(summaryOct.outstandingThisMonth).toBe('0');
      expect(summaryOct.hasFeeRecords).toBe(false);
    });
  });

  describe('3. Needs Attention Sorting & Prioritization', () => {
    it('prioritizes OVERDUE first, then PARTIALLY_PAID, then DUE, and excludes PAID', async () => {
      vi.spyOn(prisma.student, 'count').mockResolvedValue(3);

      const mockFeeRecords = [
        {
          id: 'fee-partial',
          studentId: 'std-1',
          billingYear: 2026,
          billingMonth: 9,
          amountDue: new Decimal(2000),
          dueDate: new Date('2026-09-10'),
          student: {
            id: 'std-1',
            name: 'Student Partial',
            guardianName: null,
            phone: null,
            className: '10th',
            status: 'ACTIVE' as const,
          },
          payments: [{ id: 'p-1', amount: new Decimal(500) }],
        },
        {
          id: 'fee-paid',
          studentId: 'std-2',
          billingYear: 2026,
          billingMonth: 9,
          amountDue: new Decimal(1000),
          dueDate: new Date('2026-09-05'),
          student: {
            id: 'std-2',
            name: 'Student Paid',
            guardianName: null,
            phone: null,
            className: '10th',
            status: 'ACTIVE' as const,
          },
          payments: [{ id: 'p-2', amount: new Decimal(1000) }],
        },
        {
          id: 'fee-overdue',
          studentId: 'std-3',
          billingYear: 2026,
          billingMonth: 9,
          amountDue: new Decimal(1500),
          dueDate: new Date('2026-09-01'),
          student: {
            id: 'std-3',
            name: 'Student Overdue',
            guardianName: null,
            phone: null,
            className: '10th',
            status: 'ACTIVE' as const,
          },
          payments: [],
        },
      ];

      vi.spyOn(prisma.feeRecord, 'findMany').mockResolvedValue(mockFeeRecords as never);
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([]);

      const summary = await DashboardService.getDashboardSummary(teacherA, 2026, 9);

      // Needs Attention must exclude PAID and put OVERDUE before PARTIALLY_PAID
      expect(summary.needsAttention).toHaveLength(2);
      expect(summary.needsAttention[0].id).toBe('fee-overdue');
      expect(summary.needsAttention[0].status).toBe('OVERDUE');
      expect(summary.needsAttention[1].id).toBe('fee-partial');
      expect(summary.needsAttention[1].status).toBe('PARTIALLY_PAID');
    });
  });

  describe('4. Empty States & Authorization Isolation', () => {
    it('returns empty summary when teacher has no active students or fees', async () => {
      vi.spyOn(prisma.student, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.feeRecord, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([]);

      const summary = await DashboardService.getDashboardSummary(teacherB, 2026, 9);

      expect(summary.activeStudentsCount).toBe(0);
      expect(summary.collectedThisMonth).toBe('0');
      expect(summary.outstandingThisMonth).toBe('0');
      expect(summary.hasFeeRecords).toBe(false);
      expect(summary.needsAttention).toHaveLength(0);
      expect(summary.recentPayments).toHaveLength(0);
    });
  });
});
