import { prisma } from '@/lib/db/prisma';
import { FeeRecordGenerateInput, feeRecordGenerateSchema } from '@/lib/validations';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import {
  calculateDueDate,
  calculateFeeStatus,
  calculateOutstanding,
  toDecimal,
} from '@/lib/utils/financial';
import { FeeRecord, Payment, Student, FeeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface FeeRecordWithComputed {
  record: FeeRecord;
  totalPaid: Decimal;
  outstanding: Decimal;
  computedStatus: string;
}

export class FeeService {
  /**
   * Ensures a FeeRecord exists for a student and billing month/year.
   * Idempotent: returns existing record if already generated.
   * Preserves historical fee amounts.
   */
  static async ensureFeeRecord(userId: string, input: FeeRecordGenerateInput): Promise<FeeRecord> {
    const validated = feeRecordGenerateSchema.safeParse(input);
    if (!validated.success) {
      throw new ValidationError(
        'Invalid fee generation parameters',
        validated.error.flatten().fieldErrors
      );
    }

    const { studentId, billingYear, billingMonth } = validated.data;

    // 1. Verify student existence & ownership
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundError(`Student ${studentId} not found`);
    }

    if (student.userId !== userId) {
      throw new AuthorizationError('Unauthorized access to student');
    }

    // 2. Joining Date rule: Do not bill for months prior to joining month
    const joiningDate = new Date(student.joiningDate);
    const joiningYear = joiningDate.getUTCFullYear();
    const joiningMonth = joiningDate.getUTCMonth() + 1; // 1 to 12

    if (billingYear < joiningYear || (billingYear === joiningYear && billingMonth < joiningMonth)) {
      throw new ValidationError(
        `Cannot generate fee for ${billingMonth}/${billingYear}: Prior to student joining date (${joiningMonth}/${joiningYear})`
      );
    }

    // 3. Check for existing fee record (Idempotency)
    const existing = await prisma.feeRecord.findUnique({
      where: {
        student_billing_period_unique: {
          studentId,
          billingYear,
          billingMonth,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // 4. Calculate clamped due date & initial status
    const dueDate = calculateDueDate(billingYear, billingMonth, student.feeDueDay);
    const initialStatus = calculateFeeStatus({
      amountDue: student.monthlyFee,
      totalPaid: new Decimal(0),
      dueDate,
    });

    // 5. Create fee record with snapshot of student's current monthlyFee
    return prisma.feeRecord.create({
      data: {
        studentId,
        billingYear,
        billingMonth,
        amountDue: student.monthlyFee,
        dueDate,
        status: initialStatus,
      },
    });
  }

  /**
   * Retrieves a fee record along with payments and verified ownership
   */
  static async getFeeRecordById(
    userId: string,
    feeRecordId: string
  ): Promise<FeeRecord & { student: Student; payments: Payment[] }> {
    const record = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: {
        student: true,
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
      },
    });

    if (!record) {
      throw new NotFoundError(`Fee record ${feeRecordId} not found`);
    }

    if (record.student.userId !== userId) {
      throw new AuthorizationError('Unauthorized access to fee record');
    }

    return record;
  }

  /**
   * Computes authoritative totals and status for a fee record from payment transactions
   */
  static computeFeeRecordState(
    record: FeeRecord & { payments: Payment[] },
    asOfDate?: Date | string
  ): FeeRecordWithComputed {
    const totalPaid = record.payments.reduce(
      (acc, p) => acc.plus(toDecimal(p.amount)),
      new Decimal(0)
    );

    const outstanding = calculateOutstanding(record.amountDue, totalPaid);
    const computedStatus = calculateFeeStatus({
      amountDue: record.amountDue,
      totalPaid,
      dueDate: record.dueDate,
      currentDate: asOfDate,
    });

    return {
      record,
      totalPaid,
      outstanding,
      computedStatus,
    };
  }

  /**
   * Synchronizes and updates the stored status if different from computed
   */
  static async syncFeeRecordStatus(feeRecordId: string): Promise<FeeRecord> {
    const record = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: { payments: true },
    });

    if (!record) {
      throw new NotFoundError(`Fee record ${feeRecordId} not found`);
    }

    const { computedStatus } = this.computeFeeRecordState(record);

    if (record.status !== computedStatus) {
      return prisma.feeRecord.update({
        where: { id: feeRecordId },
        data: { status: computedStatus as FeeStatus },
      });
    }

    return record;
  }
}
