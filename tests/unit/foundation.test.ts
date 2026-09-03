import { describe, it, expect } from 'vitest';
import { formatINR, formatMonthName } from '@/lib/utils';
import { loginSchema, studentCreateSchema } from '@/lib/validations';
import { AppError, ValidationError } from '@/lib/errors';

describe('Fees Hisab Foundation & Architecture Tests', () => {
  it('formats currency correctly in Indian Rupee format (INR)', () => {
    expect(formatINR(2000)).toBe('₹2,000');
    expect(formatINR(38500)).toBe('₹38,500');
    expect(formatINR(0)).toBe('₹0');
  });

  it('formats billing month strings into human readable text', () => {
    expect(formatMonthName('2026-09')).toBe('September 2026');
    expect(formatMonthName('2026-01')).toBe('January 2026');
  });

  it('validates login input with Zod schema', () => {
    const valid = loginSchema.safeParse({
      email: 'teacher@fees-hisab.in',
      password: 'securepassword123',
    });
    expect(valid.success).toBe(true);

    const invalid = loginSchema.safeParse({
      email: 'not-an-email',
      password: '123',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates student draft schema with Zod', () => {
    const validStudent = studentCreateSchema.safeParse({
      name: 'Rahul Sharma',
      class: 'Class 8',
      subjects: ['Mathematics', 'Science'],
      monthlyFee: 2000,
      feeDueDay: 5,
      joiningDate: '2026-06-01',
    });
    expect(validStudent.success).toBe(true);

    const negativeFeeStudent = studentCreateSchema.safeParse({
      name: 'Rahul Sharma',
      class: 'Class 8',
      subjects: ['Mathematics'],
      monthlyFee: -500,
      feeDueDay: 5,
      joiningDate: '2026-06-01',
    });
    expect(negativeFeeStudent.success).toBe(false);
  });

  it('correctly handles error hierarchy', () => {
    const err = new ValidationError('Invalid student data');
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
  });
});
