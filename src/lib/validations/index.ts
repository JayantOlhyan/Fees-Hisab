import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Foundation schemas for Future Phases (Draft contracts)
export const studentCreateSchema = z.object({
  name: z.string().trim().min(1, 'Student name is required').max(100),
  guardianName: z.string().trim().max(100).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .optional()
    .or(z.literal('')),
  class: z.string().trim().min(1, 'Class is required'),
  school: z.string().trim().max(100).optional(),
  subjects: z.array(z.string().trim().min(1)).min(1, 'At least one subject is required'),
  monthlyFee: z.number().nonnegative('Monthly fee cannot be negative'),
  feeDueDay: z.number().int().min(1).max(31, 'Due day must be between 1 and 31'),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().trim().max(500).optional(),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;

export const paymentRecordSchema = z.object({
  feeRecordId: z.string().min(1, 'Fee record ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  paymentMethod: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Other']),
  notes: z.string().trim().max(250).optional(),
});

export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;
