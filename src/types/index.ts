export type StudentStatus = 'ACTIVE' | 'ARCHIVED';

export type FeeStatus = 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';

export interface Payment {
  id: string;
  studentId: string;
  feeRecordId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  billingMonth: string; // Format "YYYY-MM", e.g. "2026-09"
  amountDue: number;
  amountPaid: number;
  dueDate: string; // YYYY-MM-DD
  status: FeeStatus;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  guardianName?: string;
  phone?: string;
  class: string;
  school?: string;
  subjects: string[];
  joiningDate: string; // YYYY-MM-DD
  monthlyFee: number;
  feeDueDay: number; // 1 to 31
  status: StudentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeRecordWithStudent extends FeeRecord {
  student: Student;
  outstanding: number;
}

export interface StudentWithFeeSummary extends Student {
  currentFeeRecord?: FeeRecord;
  currentOutstanding: number;
  currentStatus: FeeStatus;
  totalHistoricalPaid: number;
}

export interface DashboardMetrics {
  totalStudents: number;
  collectedThisMonth: number;
  totalOutstanding: number;
  overdueStudentsCount: number;
  attentionFees: FeeRecordWithStudent[];
  recentPayments: (Payment & { studentName: string; studentClass: string })[];
}
