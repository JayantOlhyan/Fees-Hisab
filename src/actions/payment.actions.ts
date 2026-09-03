'use server';

import { revalidatePath } from 'next/cache';
import { recordPayment, getPayments } from '@/lib/notion/service';
import { Payment, PaymentMethod } from '@/types';

export type PaymentActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function recordPaymentAction(input: {
  studentId: string;
  feeRecordId: string;
  studentName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}): Promise<PaymentActionResult<Payment>> {
  try {
    const payment = await recordPayment(input);
    revalidatePath('/fees');
    revalidatePath(`/students/${input.studentId}`);
    return { success: true, data: payment };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record payment' };
  }
}

export async function getPaymentsForStudentAction(
  studentId: string
): Promise<PaymentActionResult<Payment[]>> {
  try {
    const payments = await getPayments(studentId);
    return { success: true, data: payments };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payments' };
  }
}
