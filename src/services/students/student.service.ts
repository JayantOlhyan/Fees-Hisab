import { prisma } from '@/lib/db/prisma';
import {
  studentCreateSchema,
  studentUpdateSchema,
  StudentCreateInput,
  StudentUpdateInput,
} from '@/lib/validations';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { toDecimal } from '@/lib/utils/financial';
import { Student } from '@prisma/client';

export class StudentService {
  /**
   * Creates a new student for the authenticated user
   */
  static async createStudent(userId: string, input: StudentCreateInput): Promise<Student> {
    const validated = studentCreateSchema.safeParse(input);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.flatten().fieldErrors);
    }

    const {
      name,
      guardianName,
      phone,
      className,
      school,
      subjects,
      monthlyFee,
      feeDueDay,
      joiningDate,
      notes,
    } = validated.data;

    return prisma.student.create({
      data: {
        userId,
        name,
        guardianName: guardianName || null,
        phone: phone || null,
        className,
        school: school || null,
        subjects,
        joiningDate: new Date(joiningDate),
        monthlyFee: toDecimal(monthlyFee),
        feeDueDay,
        status: 'ACTIVE',
        notes: notes || null,
      },
    });
  }

  /**
   * Retrieves all students belonging to the user
   */
  static async getStudents(userId: string, includeArchived = false): Promise<Student[]> {
    return prisma.student.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { status: 'ACTIVE' }),
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Retrieves a single student ensuring ownership
   */
  static async getStudentById(userId: string, studentId: string): Promise<Student> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID ${studentId} not found`);
    }

    if (student.userId !== userId) {
      throw new AuthorizationError('You do not have permission to access this student');
    }

    return student;
  }

  /**
   * Updates an existing student ensuring ownership
   */
  static async updateStudent(
    userId: string,
    studentId: string,
    input: StudentUpdateInput
  ): Promise<Student> {
    await this.getStudentById(userId, studentId); // Ensures existence & ownership

    const validated = studentUpdateSchema.safeParse(input);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.flatten().fieldErrors);
    }

    const data: Record<string, unknown> = { ...validated.data };
    if (validated.data.monthlyFee !== undefined) {
      data.monthlyFee = toDecimal(validated.data.monthlyFee);
    }
    if (validated.data.joiningDate !== undefined) {
      data.joiningDate = new Date(validated.data.joiningDate);
    }

    return prisma.student.update({
      where: { id: studentId },
      data,
    });
  }

  /**
   * Safely archives a student (preserves history, never deletes)
   */
  static async archiveStudent(userId: string, studentId: string): Promise<Student> {
    await this.getStudentById(userId, studentId);

    return prisma.student.update({
      where: { id: studentId },
      data: { status: 'ARCHIVED' },
    });
  }

  /**
   * Activates an archived student
   */
  static async activateStudent(userId: string, studentId: string): Promise<Student> {
    await this.getStudentById(userId, studentId);

    return prisma.student.update({
      where: { id: studentId },
      data: { status: 'ACTIVE' },
    });
  }
}
