'use server';

import { revalidatePath } from 'next/cache';
import { createStudent, getStudents, getStudentById, updateStudent, archiveStudentInNotion } from '@/lib/notion/service';
import { Student } from '@/types';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createStudentAction(input: {
  name: string;
  guardianName?: string;
  phone?: string;
  className?: string;
  school?: string;
  subjects?: string[];
  monthlyFee: number;
  feeDueDay: number;
  joiningDate: string;
  notes?: string;
}): Promise<ActionResult<Student>> {
  try {
    const student = await createStudent({
      name: input.name,
      guardianName: input.guardianName,
      phone: input.phone,
      class: input.className,
      school: input.school,
      subjects: input.subjects,
      joiningDate: input.joiningDate,
      monthlyFee: input.monthlyFee,
      feeDueDay: input.feeDueDay,
      notes: input.notes,
    });
    revalidatePath('/students');
    return { success: true, data: student };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create student' };
  }
}

export async function getStudentsAction(includeArchived = false): Promise<ActionResult<Student[]>> {
  try {
    const students = await getStudents(includeArchived);
    return { success: true, data: students };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch students' };
  }
}

export async function getStudentByIdAction(id: string): Promise<ActionResult<Student>> {
  try {
    const student = await getStudentById(id);
    return { success: true, data: student };
  } catch (err: any) {
    return { success: false, error: err.message || 'Student not found' };
  }
}

export async function updateStudentAction(
  id: string,
  input: Partial<{
    name: string;
    guardianName: string;
    phone: string;
    className: string;
    school: string;
    subjects: string[];
    monthlyFee: number;
    feeDueDay: number;
    joiningDate: string;
    notes: string;
  }>
): Promise<ActionResult<Student>> {
  try {
    const student = await updateStudent(id, {
      name: input.name,
      guardianName: input.guardianName,
      phone: input.phone,
      class: input.className,
      school: input.school,
      subjects: input.subjects,
      joiningDate: input.joiningDate,
      monthlyFee: input.monthlyFee,
      feeDueDay: input.feeDueDay,
      notes: input.notes,
    });
    revalidatePath('/students');
    revalidatePath(`/students/${id}`);
    return { success: true, data: student };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update student' };
  }
}

export async function archiveStudentAction(id: string): Promise<ActionResult<void>> {
  try {
    await archiveStudentInNotion(id);
    revalidatePath('/students');
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to archive student' };
  }
}

export async function restoreStudentAction(id: string): Promise<ActionResult<Student>> {
  try {
    const student = await updateStudent(id, { status: 'ACTIVE' });
    revalidatePath('/students');
    revalidatePath(`/students/${id}`);
    return { success: true, data: student };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to restore student' };
  }
}

export async function exportAllNotionDataAction() {
  try {
    const { getStudents, getFeeRecords, getPayments } = await import('@/lib/notion/service');
    const students = await getStudents(true);
    const feeRecords = await getFeeRecords();
    const payments = await getPayments();
    return { success: true, data: { students, feeRecords, payments } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to export Notion data' };
  }
}

