import { prisma } from '@/lib/db/prisma';
import { calculateFeeStatus, calculateOutstanding } from '@/lib/utils/financial';
import { FeeStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';


export interface DashboardNeedsAttentionItem {
  id: string;
  studentId: string;
  studentName: string;
  guardianName: string | null;
  phone: string | null;
  className: string | null;
  billingYear: number;
  billingMonth: number;
  amountDue: string;
  totalPaid: string;
  outstanding: string;
  dueDate: string;
  status: FeeStatus;
}

export interface DashboardRecentPaymentItem {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  feeRecordId: string;
}

export interface DashboardSummary {
  billingYear: number;
  billingMonth: number;
  activeStudentsCount: number;
  collectedThisMonth: string;
  outstandingThisMonth: string;
  overdueCount: number;
  paidCount: number;
  partiallyPaidCount: number;
  dueCount: number;
  upcomingCount: number;
  hasFeeRecords: boolean;
  needsAttention: DashboardNeedsAttentionItem[];
  recentPayments: DashboardRecentPaymentItem[];
}

export class DashboardService {
  /**
   * Retrieves production dashboard summary for a teacher and billing period (year, month).
   * Summarizes real database records from Student, FeeRecord, and Payment with DB fallback.
   */
  static async getDashboardSummary(
    userId: string,
    year: number,
    month: number
  ): Promise<DashboardSummary> {
    try {
      // 1. Count active students in DB
      const activeStudentsCount = await prisma.student.count({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      // 2. Fetch FeeRecords for the specified billing period belonging to the teacher
      const feeRecords = await prisma.feeRecord.findMany({
        where: {
          student: { userId },
          billingYear: year,
          billingMonth: month,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              guardianName: true,
              phone: true,
              className: true,
              status: true,
            },
          },
          payments: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

      let collectedSum = new Decimal(0);
      let outstandingSum = new Decimal(0);
      let overdueCount = 0;
      let paidCount = 0;
      let partiallyPaidCount = 0;
      let dueCount = 0;
      let upcomingCount = 0;

      const needsAttentionCandidates: DashboardNeedsAttentionItem[] = [];

      feeRecords.forEach((record) => {
        const totalPaid = record.payments.reduce((acc, p) => acc.add(p.amount), new Decimal(0));

        const outstanding = calculateOutstanding(record.amountDue, totalPaid);
        const computedStatus = calculateFeeStatus({
          amountDue: record.amountDue,
          totalPaid,
          dueDate: record.dueDate,
        });

        collectedSum = collectedSum.add(totalPaid);
        outstandingSum = outstandingSum.add(outstanding);

        switch (computedStatus) {
          case 'PAID':
            paidCount += 1;
            break;
          case 'PARTIALLY_PAID':
            partiallyPaidCount += 1;
            break;
          case 'OVERDUE':
            overdueCount += 1;
            break;
          case 'DUE':
            dueCount += 1;
            break;
          case 'UPCOMING':
            upcomingCount += 1;
            break;
        }

        if (
          (computedStatus === 'OVERDUE' ||
            computedStatus === 'PARTIALLY_PAID' ||
            computedStatus === 'DUE') &&
          record.student.status === 'ACTIVE'
        ) {
          needsAttentionCandidates.push({
            id: record.id,
            studentId: record.studentId,
            studentName: record.student.name,
            guardianName: record.student.guardianName,
            phone: record.student.phone,
            className: record.student.className,
            billingYear: record.billingYear,
            billingMonth: record.billingMonth,
            amountDue: record.amountDue.toString(),
            totalPaid: totalPaid.toString(),
            outstanding: outstanding.toString(),
            dueDate: record.dueDate.toISOString(),
            status: computedStatus,
          });
        }
      });

      const statusPriority: Record<FeeStatus, number> = {
        OVERDUE: 1,
        PARTIALLY_PAID: 2,
        DUE: 3,
        UPCOMING: 4,
        PAID: 5,
      };

      needsAttentionCandidates.sort((a, b) => {
        const prioDiff = statusPriority[a.status] - statusPriority[b.status];
        if (prioDiff !== 0) return prioDiff;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      // 3. Fetch recent payments (limit 5) for the teacher
      const rawRecentPayments = await prisma.payment.findMany({
        where: {
          student: { userId },
        },
        include: {
          student: {
            select: {
              name: true,
              className: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
        take: 5,
      });

      const recentPayments: DashboardRecentPaymentItem[] = rawRecentPayments.map((p) => ({
        id: p.id,
        studentId: p.studentId,
        studentName: p.student.name,
        className: p.student.className,
        amount: p.amount.toString(),
        paymentDate: p.paymentDate.toISOString(),
        paymentMethod: p.paymentMethod,
        notes: p.notes,
        feeRecordId: p.feeRecordId,
      }));

      return {
        billingYear: year,
        billingMonth: month,
        activeStudentsCount,
        collectedThisMonth: collectedSum.toString(),
        outstandingThisMonth: outstandingSum.toString(),
        overdueCount,
        paidCount,
        partiallyPaidCount,
        dueCount,
        upcomingCount,
        hasFeeRecords: feeRecords.length > 0,
        needsAttention: needsAttentionCandidates,
        recentPayments,
      };
    } catch {
      return {
        billingYear: year,
        billingMonth: month,
        activeStudentsCount: 0,
        collectedThisMonth: '0',
        outstandingThisMonth: '0',
        overdueCount: 0,
        paidCount: 0,
        partiallyPaidCount: 0,
        dueCount: 0,
        upcomingCount: 0,
        hasFeeRecords: false,
        needsAttention: [],
        recentPayments: [],
      };
    }
  }
}

