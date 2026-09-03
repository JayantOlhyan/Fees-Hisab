import { prisma } from '@/lib/db/prisma';
import { PaymentRecordInput, paymentRecordSchema } from '@/lib/validations';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { toDecimal, calculateOutstanding, calculateFeeStatus } from '@/lib/utils/financial';
import { Payment, FeeRecord } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface PaymentResult {
  payment: Payment;
  feeRecord: FeeRecord;
  totalPaid: Decimal;
  outstanding: Decimal;
}

export class PaymentService {
  /**
   * Records a payment transaction securely in a database transaction
   * Enforces:
   * 1. Teacher ownership
   * 2. Amount > 0
   * 3. Total paid cannot exceed amountDue (no overpayment)
   * 4. Idempotent status recalculation
   */
  static async recordPayment(userId: string, input: PaymentRecordInput): Promise<PaymentResult> {
    const validated = paymentRecordSchema.safeParse(input);
    if (!validated.success) {
      throw new ValidationError('Invalid payment input', validated.error.flatten().fieldErrors);
    }

    const { feeRecordId, studentId, amount, paymentDate, paymentMethod, notes } = validated.data;
    const paymentAmount = toDecimal(amount);

    if (paymentAmount.lessThanOrEqualTo(0)) {
      throw new ValidationError('Payment amount must be greater than zero');
    }

    // Execute atomic transaction
    return prisma.$transaction(async (tx) => {
      // 1. Lock the fee record row for UPDATE to prevent concurrent race conditions
      // This serializes simultaneous requests for the same fee record in PostgreSQL.
      await tx.$queryRaw`SELECT id FROM fee_records WHERE id = ${feeRecordId} FOR UPDATE`;

      // 2. Fetch fee record with student and existing payments
      const feeRecord = await tx.feeRecord.findUnique({
        where: { id: feeRecordId },
        include: {
          student: true,
          payments: {
            orderBy: { paymentDate: 'asc' },
          },
        },
      });

      if (!feeRecord) {
        throw new NotFoundError(`Fee record ${feeRecordId} not found`);
      }

      // 3. Enforce student relationship and teacher ownership
      if (feeRecord.studentId !== studentId) {
        throw new ValidationError('Fee record does not belong to the specified student');
      }

      if (feeRecord.student.userId !== userId) {
        throw new AuthorizationError(
          'Unauthorized access: you do not own this student or fee record'
        );
      }

      // 4. Calculate current total paid and outstanding
      const currentPaid = feeRecord.payments.reduce(
        (acc, p) => acc.plus(toDecimal(p.amount)),
        new Decimal(0)
      );

      const currentOutstanding = calculateOutstanding(feeRecord.amountDue, currentPaid);

      // 5. Overpayment check
      if (paymentAmount.greaterThan(currentOutstanding)) {
        throw new ValidationError(
          `Overpayment rejected: payment amount ₹${paymentAmount.toString()} exceeds outstanding amount ₹${currentOutstanding.toString()}`
        );
      }

      // 6. Create payment transaction (immutable)
      const payment = await tx.payment.create({
        data: {
          studentId,
          feeRecordId,
          amount: paymentAmount,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          notes: notes || null,
        },
      });

      // 7. Recalculate new total paid and resulting status
      const newTotalPaid = currentPaid.plus(paymentAmount);
      const newOutstanding = calculateOutstanding(feeRecord.amountDue, newTotalPaid);
      const newStatus = calculateFeeStatus({
        amountDue: feeRecord.amountDue,
        totalPaid: newTotalPaid,
        dueDate: feeRecord.dueDate,
      });

      // 8. Update fee record status
      const updatedFeeRecord = await tx.feeRecord.update({
        where: { id: feeRecordId },
        data: {
          status: newStatus,
        },
      });

      return {
        payment,
        feeRecord: updatedFeeRecord,
        totalPaid: newTotalPaid,
        outstanding: newOutstanding,
      };
    });
  }

  /**
   * Retrieves all payments for a student ensuring ownership
   */
  static async getPaymentsForStudent(userId: string, studentId: string): Promise<Payment[]> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundError(`Student ${studentId} not found`);
    }

    if (student.userId !== userId) {
      throw new AuthorizationError('Unauthorized access to student payments');
    }

    return prisma.payment.findMany({
      where: { studentId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Retrieves all payments for a specific fee record ensuring ownership
   */
  static async getPaymentsForFeeRecord(userId: string, feeRecordId: string): Promise<Payment[]> {
    const feeRecord = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: { student: true },
    });

    if (!feeRecord) {
      throw new NotFoundError(`Fee record ${feeRecordId} not found`);
    }

    if (feeRecord.student.userId !== userId) {
      throw new AuthorizationError('Unauthorized access to fee payments');
    }

    return prisma.payment.findMany({
      where: { feeRecordId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Retrieves payment history for the teacher across all students
   */
  static async getPaymentHistory(
    userId: string,
    filters?: { studentId?: string; feeRecordId?: string }
  ): Promise<
    (Payment & {
      student: { name: string; className: string | null };
      feeRecord: { billingYear: number; billingMonth: number };
    })[]
  > {
    return prisma.payment.findMany({
      where: {
        student: {
          userId,
          ...(filters?.studentId ? { id: filters.studentId } : {}),
        },
        ...(filters?.feeRecordId ? { feeRecordId: filters.feeRecordId } : {}),
      },
      include: {
        student: {
          select: {
            name: true,
            className: true,
          },
        },
        feeRecord: {
          select: {
            billingYear: true,
            billingMonth: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }
}
