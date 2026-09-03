'use server';

import { revalidatePath } from 'next/cache';
import { StudentService } from '@/services/students/student.service';
import { StudentCreateInput, StudentUpdateInput } from '@/lib/validations';
import { sanitizeError, AuthenticationError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import { Student } from '@prisma/client';

export type ActionResult<T> =
  | { success: true; student: T }
  | { success: false; error: string; code: string; details?: unknown };

export async function createStudentAction(
  input: StudentCreateInput
): Promise<ActionResult<Student>> {
  try {
    const session = await requireAuth();
    const student = await StudentService.createStudent(session.userId, input);
    revalidatePath('/students');
    return { success: true, student };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}

export async function updateStudentAction(
  studentId: string,
  input: StudentUpdateInput
): Promise<ActionResult<Student>> {
  try {
    const session = await requireAuth();
    const student = await StudentService.updateStudent(session.userId, studentId, input);
    revalidatePath('/students');
    revalidatePath(`/students/${studentId}`);
    return { success: true, student };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}

export async function archiveStudentAction(studentId: string): Promise<ActionResult<Student>> {
  try {
    const session = await requireAuth();
    const student = await StudentService.archiveStudent(session.userId, studentId);
    revalidatePath('/students');
    revalidatePath(`/students/${studentId}`);
    return { success: true, student };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}

export async function restoreStudentAction(studentId: string): Promise<ActionResult<Student>> {
  try {
    const session = await requireAuth();
    const student = await StudentService.activateStudent(session.userId, studentId);
    revalidatePath('/students');
    revalidatePath(`/students/${studentId}`);
    return { success: true, student };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}
