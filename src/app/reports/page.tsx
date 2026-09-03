import React from 'react';
import { getStudents, getFeeRecords, getPayments } from '@/lib/notion/service';
import { ReportsClient } from './ReportsClient';
import { Student, FeeRecord, Payment } from '@/types';

export default async function ReportsPage() {
  let students: Student[] = [];
  let feeRecords: FeeRecord[] = [];
  let payments: Payment[] = [];

  try {
    students = await getStudents(true);
    feeRecords = await getFeeRecords();
    payments = await getPayments();
  } catch {
    students = [];
    feeRecords = [];
    payments = [];
  }

  return <ReportsClient students={students} feeRecords={feeRecords} payments={payments} />;
}
