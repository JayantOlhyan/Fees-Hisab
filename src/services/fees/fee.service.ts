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

export interface BulkFeeGenerationResult {
  billingYear: number;
  billingMonth: number;
  totalActiveStudents: number;
  createdCount: number;
  alreadyExistingCount: number;
  skippedPreJoiningCount: number;
  errors: Array<{ studentId: string; studentName: string; error: string }>;
}

export interface FeeRecordWithStudentAndPayment {
  id: string;
  studentId: string;
  studentName: string;
  guardianName: string | null;
  phone: string | null;
  className: string | null;
  billingYear: number;
  billingMonth: number;
  amountDue: string;
  dueDate: string;
  totalPaid: string;
  outstanding: string;
  status: FeeStatus;
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

    // 3. Calculate clamped due date
    const dueDate = calculateDueDate(billingYear, billingMonth, student.feeDueDay);
    const initialStatus = calculateFeeStatus({
      amountDue: student.monthlyFee,
      totalPaid: new Decimal(0),
      dueDate,
    });

    // 4. Atomic upsert to ensure strict concurrency idempotency
    return prisma.feeRecord.upsert({
      where: {
        student_billing_period_unique: {
          studentId,
          billingYear,
          billingMonth,
        },
      },
      update: {
        // Do NOT mutate amountDue or historical snapshot!
      },
      create: {
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
   * Generates fees for all active students belonging to the teacher for a given period.
   * Defaults to current calendar year and month (calculated server-side).
   * Archived students are strictly skipped.
   */
  static async generateFeesForTeacher(
    userId: string,
    year?: number,
    month?: number
  ): Promise<BulkFeeGenerationResult> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;

    if (targetMonth < 1 || targetMonth > 12) {
      throw new ValidationError(`Invalid billing month: ${targetMonth}. Must be 1 to 12`);
    }

    const activeStudents = await prisma.student.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { name: 'asc' },
    });

    const result: BulkFeeGenerationResult = {
      billingYear: targetYear,
      billingMonth: targetMonth,
      totalActiveStudents: activeStudents.length,
      createdCount: 0,
      alreadyExistingCount: 0,
      skippedPreJoiningCount: 0,
      errors: [],
    };

    for (const student of activeStudents) {
      try {
        const joiningDate = new Date(student.joiningDate);
        const joiningYear = joiningDate.getUTCFullYear();
        const joiningMonth = joiningDate.getUTCMonth() + 1;

        if (
          targetYear < joiningYear ||
          (targetYear === joiningYear && targetMonth < joiningMonth)
        ) {
          result.skippedPreJoiningCount++;
          continue;
        }

        // Check if existing record
        const existing = await prisma.feeRecord.findUnique({
          where: {
            student_billing_period_unique: {
              studentId: student.id,
              billingYear: targetYear,
              billingMonth: targetMonth,
            },
          },
        });

        if (existing) {
          result.alreadyExistingCount++;
          continue;
        }

        const dueDate = calculateDueDate(targetYear, targetMonth, student.feeDueDay);
        const initialStatus = calculateFeeStatus({
          amountDue: student.monthlyFee,
          totalPaid: new Decimal(0),
          dueDate,
        });

        await prisma.feeRecord.create({
          data: {
            studentId: student.id,
            billingYear: targetYear,
            billingMonth: targetMonth,
            amountDue: student.monthlyFee,
            dueDate,
            status: initialStatus,
          },
        });

        result.createdCount++;
      } catch (err) {
        result.errors.push({
          studentId: student.id,
          studentName: student.name,
          error: (err as Error).message,
        });
      }
    }

    return result;
  }

  /**
   * Retrieves all FeeRecords for a teacher in a specific billing year & month.
   * Computes outstanding, totalPaid, and current status server-side.
   */
  static async getFeeRecordsForPeriod(
    userId: string,
    year: number,
    month: number
  ): Promise<FeeRecordWithStudentAndPayment[]> {
    const records = await prisma.feeRecord.findMany({
      where: {
        billingYear: year,
        billingMonth: month,
        student: {
          userId,
        },
      },
      include: {
        student: true,
        payments: true,
      },
      orderBy: {
        student: {
          name: 'asc',
        },
      },
    });

    const now = new Date();

    return records.map((rec) => {
      const state = this.computeFeeRecordState(rec, now);
      return {
        id: rec.id,
        studentId: rec.studentId,
        studentName: rec.student.name,
        guardianName: rec.student.guardianName,
        phone: rec.student.phone,
        className: rec.student.className,
        billingYear: rec.billingYear,
        billingMonth: rec.billingMonth,
        amountDue: rec.amountDue.toString(),
        dueDate: rec.dueDate.toISOString(),
        totalPaid: state.totalPaid.toString(),
        outstanding: state.outstanding.toString(),
        status: state.computedStatus as FeeStatus,
      };
    });
  }

  /**
   * Retrieves all FeeRecords for a specific student, enforcing teacher ownership
   */
  static async getStudentFeeRecords(
    userId: string,
    studentId: string
  ): Promise<FeeRecordWithStudentAndPayment[]> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundError(`Student ${studentId} not found`);
    }

    if (student.userId !== userId) {
      throw new AuthorizationError('Unauthorized access to student');
    }

    const records = await prisma.feeRecord.findMany({
      where: { studentId },
      include: {
        student: true,
        payments: true,
      },
      orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }],
    });

    const now = new Date();

    return records.map((rec) => {
      const state = this.computeFeeRecordState(rec, now);
      return {
        id: rec.id,
        studentId: rec.studentId,
        studentName: rec.student.name,
        guardianName: rec.student.guardianName,
        phone: rec.student.phone,
        className: rec.student.className,
        billingYear: rec.billingYear,
        billingMonth: rec.billingMonth,
        amountDue: rec.amountDue.toString(),
        dueDate: rec.dueDate.toISOString(),
        totalPaid: state.totalPaid.toString(),
        outstanding: state.outstanding.toString(),
        status: state.computedStatus as FeeStatus,
      };
    });
  }

  /**
   * Retrieves a single fee record along with payments and verified ownership
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
