import { Student, FeeRecord, Payment, FeeStatus } from '@/types';
import { initialStudents, initialFeeRecords, initialPayments } from '@/data/seedData';

const STORAGE_KEYS = {
  STUDENTS: 'fees_hisab_students',
  FEE_RECORDS: 'fees_hisab_fee_records',
  PAYMENTS: 'fees_hisab_payments',
  SETTINGS: 'fees_hisab_settings',
};

export interface AppSettings {
  teacherName: string;
  salutation: "Ma'am" | 'Sir' | 'Teacher';
  currency: string;
}

const defaultSettings: AppSettings = {
  teacherName: 'Sunita Sharma',
  salutation: "Ma'am",
  currency: '₹',
};

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw || raw === 'undefined' || raw === 'null') return defaultSettings;
    return JSON.parse(raw);
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// Student CRUD
export function getStudents(): Student[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw || raw === 'undefined' || raw === 'null') {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


export function saveStudents(students: Student[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

export function addStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Student {
  const students = getStudents();
  const now = new Date().toISOString();
  const newStudent: Student = {
    ...studentData,
    id: 'std_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    createdAt: now,
    updatedAt: now,
  };
  students.push(newStudent);
  saveStudents(students);

  // Automatically generate fee record for current month
  const currentMonthStr = getYearMonthString(new Date());
  ensureFeeRecordsForMonth(currentMonthStr);

  return newStudent;
}


export function updateStudent(id: string, updates: Partial<Student>): Student | null {
  const students = getStudents();
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  const updated: Student = {
    ...students[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  students[idx] = updated;
  saveStudents(students);
  return updated;
}

export function archiveStudent(id: string): Student | null {
  return updateStudent(id, { status: 'ARCHIVED' });
}

export function unarchiveStudent(id: string): Student | null {
  return updateStudent(id, { status: 'ACTIVE' });
}

// Fee Records CRUD
export function getFeeRecords(): FeeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FEE_RECORDS);
    if (!raw || raw === 'undefined' || raw === 'null') {
      localStorage.setItem(STORAGE_KEYS.FEE_RECORDS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFeeRecords(records: FeeRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.FEE_RECORDS, JSON.stringify(records));
}

// Payments CRUD
export function getPayments(): Payment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!raw || raw === 'undefined' || raw === 'null') {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


export function savePayments(payments: Payment[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
}

// Helpers
export function getYearMonthString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function calculateFeeStatus(record: {
  amountDue: number;
  amountPaid: number;
  dueDate: string;
}): FeeStatus {
  const outstanding = record.amountDue - record.amountPaid;
  if (outstanding <= 0) {
    return 'PAID';
  }

  const today = new Date().toISOString().split('T')[0];
  const isPastDue = today > record.dueDate;
  const isDueToday = today === record.dueDate;

  if (record.amountPaid > 0) {
    return isPastDue ? 'OVERDUE' : 'PARTIALLY_PAID';
  }

  if (isPastDue) {
    return 'OVERDUE';
  }

  if (isDueToday) {
    return 'DUE';
  }

  return 'UPCOMING';
}

export function ensureFeeRecordsForMonth(billingMonth: string): FeeRecord[] {
  const students = getStudents().filter((s) => s.status === 'ACTIVE');
  const existingRecords = getFeeRecords();
  let modified = false;

  const [yearStr, monthStr] = billingMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  students.forEach((student) => {
    const found = existingRecords.find(
      (r) => r.studentId === student.id && r.billingMonth === billingMonth
    );

    if (!found) {
      // Calculate due date for student
      const dueDay = Math.min(student.feeDueDay, 28);
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

      const status = calculateFeeStatus({
        amountDue: student.monthlyFee,
        amountPaid: 0,
        dueDate,
      });

      const newRecord: FeeRecord = {
        id: `fee_${student.id}_${billingMonth.replace('-', '_')}`,
        studentId: student.id,
        billingMonth,
        amountDue: student.monthlyFee,
        amountPaid: 0,
        dueDate,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      existingRecords.push(newRecord);
      modified = true;
    } else {
      // Re-evaluate status based on current date
      const updatedStatus = calculateFeeStatus(found);
      if (found.status !== updatedStatus && found.status !== 'PAID') {
        found.status = updatedStatus;
        modified = true;
      }
    }
  });

  if (modified) {
    saveFeeRecords(existingRecords);
  }

  return existingRecords;
}

// Record Payment Transaction
export function recordPayment(params: {
  feeRecordId: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';
  notes?: string;
}): { payment: Payment; updatedFeeRecord: FeeRecord } {
  const records = getFeeRecords();
  const recordIndex = records.findIndex((r) => r.id === params.feeRecordId);
  if (recordIndex === -1) {
    throw new Error('Fee record not found');
  }

  const feeRecord = records[recordIndex];
  const newAmountPaid = feeRecord.amountPaid + params.amount;
  const newStatus = calculateFeeStatus({
    amountDue: feeRecord.amountDue,
    amountPaid: newAmountPaid,
    dueDate: feeRecord.dueDate,
  });

  const updatedRecord: FeeRecord = {
    ...feeRecord,
    amountPaid: newAmountPaid,
    status: newStatus,
    paymentDate: params.paymentDate,
    paymentMethod: params.paymentMethod,
    notes: params.notes || feeRecord.notes,
    updatedAt: new Date().toISOString(),
  };

  records[recordIndex] = updatedRecord;
  saveFeeRecords(records);

  // Add payment entry
  const payments = getPayments();
  const newPayment: Payment = {
    id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    studentId: params.studentId,
    feeRecordId: params.feeRecordId,
    amount: params.amount,
    paymentDate: params.paymentDate,
    paymentMethod: params.paymentMethod,
    notes: params.notes,
    createdAt: new Date().toISOString(),
  };

  payments.unshift(newPayment);
  savePayments(payments);

  return { payment: newPayment, updatedFeeRecord: updatedRecord };

}

// Export / Import
export function exportAllData() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    students: getStudents(),
    feeRecords: getFeeRecords(),
    payments: getPayments(),
    settings: getSettings(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonData: string): boolean {
  try {
    const parsed = JSON.parse(jsonData);
    if (!parsed.students || !parsed.feeRecords || !parsed.payments) {
      throw new Error('Invalid format');
    }
    saveStudents(parsed.students);
    saveFeeRecords(parsed.feeRecords);
    savePayments(parsed.payments);
    if (parsed.settings) {
      saveSettings(parsed.settings);
    }
    return true;
  } catch (err) {
    console.error('Import failed', err);
    return false;
  }
}

export function resetToSeedData() {
  saveStudents([]);
  saveFeeRecords([]);
  savePayments([]);
  saveSettings(defaultSettings);
}

