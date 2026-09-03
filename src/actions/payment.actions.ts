'use server';

import { revalidatePath } from 'next/cache';
import { PaymentService, PaymentResult } from '@/services/payments/payment.service';
import { PaymentRecordInput } from '@/lib/validations';
import { sanitizeError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import { Payment } from '@prisma/client';

export type PaymentActionResult<T> =
  { success: true; data: T } | { success: false; error: string; code: string; details?: unknown };

export async function recordPaymentAction(
  input: PaymentRecordInput
): Promise<PaymentActionResult<PaymentResult>> {
  try {
    const session = await requireAuth();
    const result = await PaymentService.recordPayment(session.userId, input);
    revalidatePath('/fees');
    revalidatePath(`/students/${input.studentId}`);
    return { success: true, data: result };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}

export async function getPaymentsForStudentAction(
  studentId: string
): Promise<PaymentActionResult<Payment[]>> {
  try {
    const session = await requireAuth();
    const payments = await PaymentService.getPaymentsForStudent(session.userId, studentId);
    return { success: true, data: payments };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}

export async function getPaymentsForFeeAction(
  feeRecordId: string
): Promise<PaymentActionResult<Payment[]>> {
  try {
    const session = await requireAuth();
    const payments = await PaymentService.getPaymentsForFeeRecord(session.userId, feeRecordId);
    return { success: true, data: payments };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}
