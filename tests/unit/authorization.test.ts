import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentService } from '@/services/students/student.service';
import { FeeService } from '@/services/fees/fee.service';
import { PaymentService } from '@/services/payments/payment.service';
import { AuthorizationError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/db/prisma';

// Mock prisma client for unit-level authorization tests
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    feeRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Multi-Tenant Data Isolation & Authorization (Phase 1)', () => {
  const teacherA = 'teacher-user-id-AAA';
  const teacherB = 'teacher-user-id-BBB';

  const mockStudentOwnedByA = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: teacherA,
    name: 'Aarav Sharma',
    guardianName: null,
    phone: null,
    className: 'Class 8',
    school: null,
    subjects: ['Maths'],
    monthlyFee: 2000 as unknown as import('@prisma/client/runtime/library').Decimal,
    feeDueDay: 5,
    joiningDate: new Date('2026-06-01'),
    status: 'ACTIVE' as const,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StudentService Authorization', () => {
    it('allows Teacher A to access their own student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentOwnedByA);

      const result = await StudentService.getStudentById(teacherA, mockStudentOwnedByA.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockStudentOwnedByA.id);
    });

    it('rejects Teacher B attempting to access Teacher A student with AuthorizationError', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentOwnedByA);

      await expect(StudentService.getStudentById(teacherB, mockStudentOwnedByA.id)).rejects.toThrow(
        AuthorizationError
      );
    });

    it('rejects Teacher B attempting to archive Teacher A student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentOwnedByA);

      await expect(StudentService.archiveStudent(teacherB, mockStudentOwnedByA.id)).rejects.toThrow(
        AuthorizationError
      );
    });
  });

  describe('FeeService Authorization', () => {
    it('rejects Teacher B attempting to generate fee record for Teacher A student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentOwnedByA);

      await expect(
        FeeService.ensureFeeRecord(teacherB, {
          studentId: mockStudentOwnedByA.id,
          billingYear: 2026,
          billingMonth: 9,
        })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('PaymentService Authorization', () => {
    it('rejects Teacher B attempting to view payments for Teacher A student', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(mockStudentOwnedByA);

      await expect(
        PaymentService.getPaymentsForStudent(teacherB, mockStudentOwnedByA.id)
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
