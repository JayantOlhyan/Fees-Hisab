import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  salutation: z.enum(["Ma'am", 'Sir', 'Teacher']).default("Ma'am"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Student schemas
export const studentCreateSchema = z.object({
  name: z.string().trim().min(1, 'Student name is required').max(100),
  guardianName: z.string().trim().max(100).optional().nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
    .optional()
    .or(z.literal(''))
    .nullable(),
  className: z.string().trim().min(1, 'Class is required'),
  school: z.string().trim().max(100).optional().nullable(),
  subjects: z.array(z.string().trim().min(1)).min(1, 'At least one subject is required'),
  monthlyFee: z.number().positive('Monthly fee must be greater than 0'),
  feeDueDay: z.number().int().min(1).max(31, 'Due day must be between 1 and 31'),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Joining date must be in YYYY-MM-DD format'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;

export const studentUpdateSchema = studentCreateSchema.partial();
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

// Fee Record schemas
export const feeRecordGenerateSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  billingYear: z.number().int().min(2000).max(2100),
  billingMonth: z.number().int().min(1).max(12),
});

export type FeeRecordGenerateInput = z.infer<typeof feeRecordGenerateSchema>;

// Payment schemas
export const paymentRecordSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  feeRecordId: z.string().uuid('Invalid fee record ID format'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format'),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']),
  notes: z.string().trim().max(250).optional().nullable(),
});

export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;
