'use server';

import { revalidatePath } from 'next/cache';
import { StudentService } from '@/services/students/student.service';
import { StudentCreateInput, StudentUpdateInput } from '@/lib/validations';
import { sanitizeError } from '@/lib/errors';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';
import { createSessionToken, getSession } from '@/lib/auth/session';
import { Student } from '@prisma/client';

const SESSION_COOKIE_NAME = 'fees_hisab_session';

export type ActionResult<T> =
  | { success: true; student: T }
  | { success: false; error: string; code: string; details?: unknown };

export async function getOrCreateTeacherSession() {
  const existing = await getSession();
  if (existing) return existing;

  let teacher = await prisma.user.findFirst({
    where: { email: 'demo.teacher@fees-hisab.in' },
  });

  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        email: 'demo.teacher@fees-hisab.in',
        passwordHash: 'seeded_teacher_password_hash',
        name: 'Sunita Sharma',
        salutation: "Ma'am",
      },
    });
  }

  const payload = {
    userId: teacher.id,
    email: teacher.email,
    name: teacher.name,
    salutation: teacher.salutation,
  };

  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  return payload;
}

export async function createStudentAction(
  input: StudentCreateInput
): Promise<ActionResult<Student>> {
  try {
    const session = await getOrCreateTeacherSession();
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
    const session = await getOrCreateTeacherSession();
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
    const session = await getOrCreateTeacherSession();
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
    const session = await getOrCreateTeacherSession();
    const student = await StudentService.activateStudent(session.userId, studentId);
    revalidatePath('/students');
    revalidatePath(`/students/${studentId}`);
    return { success: true, student };
  } catch (error) {
    const sanitized = sanitizeError(error);
    return { success: false, ...sanitized };
  }
}
