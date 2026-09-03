'use server';

import { revalidatePath } from 'next/cache';
import { ensureFeeRecord, getFeeRecords, updateFeeRecord } from '@/lib/notion/service';
import { FeeRecord } from '@/types';

export type FeeActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function ensureFeeRecordAction(input: {
  studentId: string;
  billingMonth: string;
  amountDue: number;
  dueDate: string;
}): Promise<FeeActionResult<FeeRecord>> {
  try {
    const record = await ensureFeeRecord(input);
    revalidatePath('/fees');
    revalidatePath(`/students/${input.studentId}`);
    return { success: true, data: record };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to ensure fee record' };
  }
}

export async function getFeeRecordsAction(
  studentId?: string
): Promise<FeeActionResult<FeeRecord[]>> {
  try {
    const records = await getFeeRecords(studentId);
    return { success: true, data: records };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch fee records' };
  }
}

export async function updateFeeRecordAction(
  id: string,
  data: Partial<{
    amountPaid: number;
    status: string;
    paymentDate: string;
    paymentMethod: string;
    notes: string;
  }>
): Promise<FeeActionResult<FeeRecord>> {
  try {
    const record = await updateFeeRecord(id, data);
    revalidatePath('/fees');
    return { success: true, data: record };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update fee record' };
  }
}

export async function generateCurrentPeriodFeesAction(
  year?: number,
  month?: number
): Promise<FeeActionResult<{ created: number; existing: number }>> {
  try {
    const { getStudents } = await import('@/lib/notion/service');
    const students = await getStudents(false);
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    const billingMonth = `${y}-${String(m).padStart(2, '0')}`;

    let created = 0;
    let existing = 0;

    for (const student of students) {
      const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(student.feeDueDay).padStart(2, '0')}`;
      const result = await ensureFeeRecord({
        studentId: student.id,
        billingMonth,
        amountDue: student.monthlyFee,
        dueDate,
      });
      // If the ID matches a freshly created one (createdAt close to now), count as created
      const ageMs = Date.now() - new Date(result.createdAt).getTime();
      if (ageMs < 5000) created++;
      else existing++;
    }

    revalidatePath('/fees');
    return { success: true, data: { created, existing } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate fee records' };
  }
}
