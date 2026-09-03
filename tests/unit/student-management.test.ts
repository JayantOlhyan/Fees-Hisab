import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentService } from '@/services/students/student.service';
import { studentCreateSchema, studentUpdateSchema } from '@/lib/validations';
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Phase 2 — Student Management Unit & Service Tests', () => {
  const teacherA = 'teacher-111';
  const teacherB = 'teacher-222';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation Suite (19 Required Cases)', () => {
    // 1. Create valid student
    it('1. Validates a complete student creation payload', () => {
      const result = studentCreateSchema.safeParse({
        name: 'Rahul Sharma',
        guardianName: 'Suresh Sharma',
        phone: '9876543210',
        className: '8th',
        school: 'DAV Public School',
        subjects: ['Mathematics', 'Science'],
        monthlyFee: 2000,
        feeDueDay: 5,
        joiningDate: '2026-04-01',
        notes: 'Good in Mathematics',
      });
      expect(result.success).toBe(true);
    });

    // 2. Reject invalid student
    it('2. Rejects student when required fields are missing', () => {
      const result = studentCreateSchema.safeParse({
        guardianName: 'Suresh Sharma',
      });
      expect(result.success).toBe(false);
    });

    // 3. Reject zero monthly fee
    it('3. Rejects zero monthly fee', () => {
      const result = studentCreateSchema.safeParse({
        name: 'Rahul Sharma',
        className: '8th',
        subjects: ['Maths'],
        monthlyFee: 0,
        feeDueDay: 5,
        joiningDate: '2026-04-01',
      });
      expect(result.success).toBe(false);
    });

    // 4. Reject negative monthly fee
    it('4. Rejects negative monthly fee', () => {
      const result = studentCreateSchema.safeParse({
        name: 'Rahul Sharma',
        className: '8th',
        subjects: ['Maths'],
        monthlyFee: -500,
        feeDueDay: 5,
        joiningDate: '2026-04-01',
      });
      expect(result.success).toBe(false);
    });

    // 5. Reject invalid due day
    it('5. Rejects due day greater than 31 or less than 1', () => {
      expect(
        studentCreateSchema.safeParse({
          name: 'Rahul Sharma',
          className: '8th',
          subjects: ['Maths'],
          monthlyFee: 2000,
          feeDueDay: 32,
          joiningDate: '2026-04-01',
        }).success
      ).toBe(false);

      expect(
        studentCreateSchema.safeParse({
          name: 'Rahul Sharma',
          className: '8th',
          subjects: ['Maths'],
          monthlyFee: 2000,
          feeDueDay: 0,
          joiningDate: '2026-04-01',
        }).success
      ).toBe(false);
    });

    // 6. Accept optional fields
    it('6. Accepts student without optional guardianName, phone, school, notes', () => {
      const result = studentCreateSchema.safeParse({
        name: 'Rahul Sharma',
        className: '8th',
        subjects: ['Maths'],
        monthlyFee: 2000,
        feeDueDay: 5,
        joiningDate: '2026-04-01',
      });
      expect(result.success).toBe(true);
    });

    // 7. Trim appropriate text fields
    it('7. Trims whitespace from name and class', () => {
      const result = studentCreateSchema.safeParse({
        name: '   Rahul Sharma   ',
        className: '  Class 8   ',
        subjects: ['Maths'],
        monthlyFee: 2000,
        feeDueDay: 5,
        joiningDate: '2026-04-01',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Rahul Sharma');
        expect(result.data.className).toBe('Class 8');
      }
    });
  });

  describe('Service Ownership & Data Isolation (Cases 8 - 19)', () => {
    const mockStudentA = {
      id: 'student-A-uuid',
      userId: teacherA,
      name: 'Rahul Sharma',
      guardianName: 'Suresh Sharma',
      phone: '9876543210',
      className: '8th',
      school: 'DAV Public School',
      subjects: ['Maths', 'Science'],
      monthlyFee: new Decimal(2000),
      feeDueDay: 5,
      joiningDate: new Date('2026-04-01'),
      status: 'ACTIVE' as const,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 8. List only authenticated user's students
    it("8. Lists only the authenticated user's students", async () => {
      vi.mocked(prisma.student.findMany).mockResolvedValueOnce([mockStudentA]);

      const list = await StudentService.getStudents(teacherA);
      expect(list).toHaveLength(1);
      expect(list[0].userId).toBe(teacherA);
      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: { userId: teacherA, status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      });
    });

    // 9. Cross-user student access denied
    it('9. Denies access when Teacher B requests Teacher A student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentA);

      await expect(StudentService.getStudentById(teacherB, mockStudentA.id)).rejects.toThrow(
        AuthorizationError
      );
    });

    // 10. Update owned student
    it('10. Allows Teacher A to update their owned student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentA);
      vi.mocked(prisma.student.update).mockResolvedValueOnce({
        ...mockStudentA,
        name: 'Rahul S.',
      });

      const updated = await StudentService.updateStudent(teacherA, mockStudentA.id, {
        name: 'Rahul S.',
      });
      expect(updated.name).toBe('Rahul S.');
    });

    // 11. Cross-user update denied
    it('11. Denies Teacher B from updating Teacher A student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentA);

      await expect(
        StudentService.updateStudent(teacherB, mockStudentA.id, { name: 'Hacked' })
      ).rejects.toThrow(AuthorizationError);
    });

    // 12. Archive owned student
    it('12. Allows Teacher A to archive their student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentA);
      vi.mocked(prisma.student.update).mockResolvedValueOnce({
        ...mockStudentA,
        status: 'ARCHIVED',
      });

      const archived = await StudentService.archiveStudent(teacherA, mockStudentA.id);
      expect(archived.status).toBe('ARCHIVED');
    });

    // 13. Cross-user archive denied
    it('13. Denies Teacher B from archiving Teacher A student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentA);

      await expect(StudentService.archiveStudent(teacherB, mockStudentA.id)).rejects.toThrow(
        AuthorizationError
      );
    });

    // 14. Restore owned student
    it('14. Allows Teacher A to restore an archived student', async () => {
      const archivedStudent = { ...mockStudentA, status: 'ARCHIVED' as const };
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(archivedStudent);
      vi.mocked(prisma.student.update).mockResolvedValueOnce({
        ...archivedStudent,
        status: 'ACTIVE',
      });

      const restored = await StudentService.activateStudent(teacherA, archivedStudent.id);
      expect(restored.status).toBe('ACTIVE');
    });

    // 15. Cross-user restore denied
    it('15. Denies Teacher B from restoring Teacher A student', async () => {
      const archivedStudent = { ...mockStudentA, status: 'ARCHIVED' as const };
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(archivedStudent);

      await expect(StudentService.activateStudent(teacherB, archivedStudent.id)).rejects.toThrow(
        AuthorizationError
      );
    });

    // 16. Archived student excluded from default active query
    it('16. Excludes archived students when includeArchived is false', async () => {
      vi.mocked(prisma.student.findMany).mockResolvedValueOnce([]);

      await StudentService.getStudents(teacherA, false);
      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: { userId: teacherA, status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      });
    });

    // 17. Archived student remains retrievable through archive-aware query
    it('17. Includes archived students when includeArchived is true', async () => {
      vi.mocked(prisma.student.findMany).mockResolvedValueOnce([
        { ...mockStudentA, status: 'ARCHIVED' },
      ]);

      const list = await StudentService.getStudents(teacherA, true);
      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: { userId: teacherA },
        orderBy: { name: 'asc' },
      });
      expect(list[0].status).toBe('ARCHIVED');
    });

    it('18. Updates only current configuration without mutating createdAt or userId', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentA);
      vi.mocked(prisma.student.update).mockResolvedValueOnce({
        ...mockStudentA,
        school: 'Modern Academy',
      });

      await StudentService.updateStudent(teacherA, mockStudentA.id, {
        school: 'Modern Academy',
      });

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            userId: expect.anything(),
            createdAt: expect.anything(),
          }),
        })
      );
    });

    // 19. Changing monthly fee updates current student configuration only
    it('19. Changing monthly fee updates student configuration only', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentA);
      vi.mocked(prisma.student.update).mockResolvedValueOnce({
        ...mockStudentA,
        monthlyFee: new Decimal(2500),
      });

      const updated = await StudentService.updateStudent(teacherA, mockStudentA.id, {
        monthlyFee: 2500,
      });
      expect(updated.monthlyFee.equals(new Decimal(2500))).toBe(true);
    });
  });
});
