'use server';

import { revalidatePath } from 'next/cache';
import { FeeService, BulkFeeGenerationResult } from '@/services/fees/fee.service';
import { FeeRecordGenerateInput } from '@/lib/validations';
import { sanitizeError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import { FeeRecord } from '@prisma/client';

export type FeeActionResult<T> =
  { success: true; data: T } | { success: false; error: string; code: string; details?: unknown };

export async function ensureFeeRecordAction(
  input: FeeRecordGenerateInput
): Promise<FeeActionResult<FeeRecord>> {
  try {
    const session = await requireAuth();
    const record = await FeeService.ensureFeeRecord(session.userId, input);
    revalidatePath('/fees');
    revalidatePath(`/students/${input.studentId}`);
    return { success: true, data: record };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}

export async function generateCurrentPeriodFeesAction(
  year?: number,
  month?: number
): Promise<FeeActionResult<BulkFeeGenerationResult>> {
  try {
    const session = await requireAuth();
    const result = await FeeService.generateFeesForTeacher(session.userId, year, month);
    revalidatePath('/fees');
    return { success: true, data: result };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}
