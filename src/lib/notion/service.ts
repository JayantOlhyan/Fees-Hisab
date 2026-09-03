/**
 * Notion Database Service — v5 SDK
 * Uses dataSources.query + pages.create/update/retrieve
 */
import { notion, DB } from './client';
import { Student, FeeRecord, Payment, FeeStatus, PaymentMethod } from '@/types';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function prop(page: PageObjectResponse, key: string): any {
  return (page.properties as any)[key];
}
function richText(p: any): string {
  return p?.rich_text?.[0]?.plain_text ?? p?.title?.[0]?.plain_text ?? '';
}
function num(p: any): number {
  return p?.number ?? 0;
}
function sel(p: any): string {
  return p?.select?.name ?? '';
}
function multiSel(p: any): string[] {
  return p?.multi_select?.map((s: any) => s.name) ?? [];
}
function dateVal(p: any): string {
  return p?.date?.start ?? '';
}
function phoneVal(p: any): string {
  return p?.phone_number ?? '';
}

function pageToStudent(page: PageObjectResponse): Student {
  return {
    id: page.id,
    name: richText(prop(page, 'Name')),
    guardianName: richText(prop(page, 'Guardian Name')) || undefined,
    phone: phoneVal(prop(page, 'Phone')) || undefined,
    class: richText(prop(page, 'Class')),
    school: richText(prop(page, 'School')) || undefined,
    subjects: multiSel(prop(page, 'Subjects')),
    joiningDate: dateVal(prop(page, 'Joining Date')),
    monthlyFee: num(prop(page, 'Monthly Fee')),
    feeDueDay: num(prop(page, 'Fee Due Day')),
    status: (sel(prop(page, 'Status')) as any) || 'ACTIVE',
    notes: richText(prop(page, 'Notes')) || undefined,
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

function pageToFeeRecord(page: PageObjectResponse): FeeRecord {
  return {
    id: page.id,
    studentId: richText(prop(page, 'Student ID')),
    billingMonth: richText(prop(page, 'Billing Month')),
    amountDue: num(prop(page, 'Amount Due')),
    amountPaid: num(prop(page, 'Amount Paid')),
    dueDate: dateVal(prop(page, 'Due Date')),
    status: (sel(prop(page, 'Status')) as FeeStatus) || 'UPCOMING',
    paymentDate: dateVal(prop(page, 'Payment Date')) || undefined,
    paymentMethod: (sel(prop(page, 'Payment Method')) as PaymentMethod) || undefined,
    notes: richText(prop(page, 'Notes')) || undefined,
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

function pageToPayment(page: PageObjectResponse): Payment {
  return {
    id: page.id,
    studentId: richText(prop(page, 'Student ID')),
    feeRecordId: richText(prop(page, 'Fee Record ID')),
    amount: num(prop(page, 'Amount')),
    paymentDate: dateVal(prop(page, 'Payment Date')),
    paymentMethod: (sel(prop(page, 'Payment Method')) as PaymentMethod) || 'Cash',
    notes: richText(prop(page, 'Notes')) || undefined,
    createdAt: page.created_time,
  };
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getStudents(includeArchived = false): Promise<Student[]> {
  const client = notion();
  const filter = includeArchived
    ? undefined
    : { property: 'Status', select: { equals: 'ACTIVE' } };

  const res = await client.dataSources.query({
    data_source_id: DB.STUDENTS,
    ...(filter ? { filter } : {}),
    sorts: [{ property: 'Name', direction: 'ascending' }],
  } as any);

  return (res.results as PageObjectResponse[]).map(pageToStudent);
}

export async function getStudentById(id: string): Promise<Student> {
  const page = await notion().pages.retrieve({ page_id: id });
  return pageToStudent(page as PageObjectResponse);
}

export async function createStudent(data: {
  name: string;
  guardianName?: string;
  phone?: string;
  class?: string;
  school?: string;
  subjects?: string[];
  joiningDate: string;
  monthlyFee: number;
  feeDueDay: number;
  notes?: string;
}): Promise<Student> {
  const page = await notion().pages.create({
    parent: { data_source_id: DB.STUDENTS } as any,
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      'Guardian Name': { rich_text: [{ text: { content: data.guardianName || '' } }] },
      Phone: { phone_number: data.phone || null },
      Class: { rich_text: [{ text: { content: data.class || '' } }] },
      School: { rich_text: [{ text: { content: data.school || '' } }] },
      Subjects: { multi_select: (data.subjects || []).map((s) => ({ name: s })) },
      'Joining Date': { date: { start: data.joiningDate } },
      'Monthly Fee': { number: data.monthlyFee },
      'Fee Due Day': { number: data.feeDueDay },
      Status: { select: { name: 'ACTIVE' } },
      Notes: { rich_text: [{ text: { content: data.notes || '' } }] },
    },
  });
  return pageToStudent(page as PageObjectResponse);
}

export async function updateStudent(
  id: string,
  data: Partial<{
    name: string;
    guardianName: string;
    phone: string;
    class: string;
    school: string;
    subjects: string[];
    joiningDate: string;
    monthlyFee: number;
    feeDueDay: number;
    status: string;
    notes: string;
  }>
): Promise<Student> {
  const props: any = {};
  if (data.name !== undefined) props['Name'] = { title: [{ text: { content: data.name } }] };
  if (data.guardianName !== undefined) props['Guardian Name'] = { rich_text: [{ text: { content: data.guardianName } }] };
  if (data.phone !== undefined) props['Phone'] = { phone_number: data.phone || null };
  if (data.class !== undefined) props['Class'] = { rich_text: [{ text: { content: data.class } }] };
  if (data.school !== undefined) props['School'] = { rich_text: [{ text: { content: data.school } }] };
  if (data.subjects !== undefined) props['Subjects'] = { multi_select: data.subjects.map((s) => ({ name: s })) };
  if (data.joiningDate !== undefined) props['Joining Date'] = { date: { start: data.joiningDate } };
  if (data.monthlyFee !== undefined) props['Monthly Fee'] = { number: data.monthlyFee };
  if (data.feeDueDay !== undefined) props['Fee Due Day'] = { number: data.feeDueDay };
  if (data.status !== undefined) props['Status'] = { select: { name: data.status } };
  if (data.notes !== undefined) props['Notes'] = { rich_text: [{ text: { content: data.notes } }] };

  const page = await notion().pages.update({ page_id: id, properties: props });
  return pageToStudent(page as PageObjectResponse);
}

export async function archiveStudentInNotion(id: string): Promise<void> {
  await notion().pages.update({
    page_id: id,
    properties: { Status: { select: { name: 'ARCHIVED' } } },
  });
}

// ─── Fee Records ──────────────────────────────────────────────────────────────

export async function getFeeRecords(studentId?: string): Promise<FeeRecord[]> {
  const client = notion();
  const filter = studentId
    ? { property: 'Student ID', rich_text: { equals: studentId } }
    : undefined;

  const res = await client.dataSources.query({
    data_source_id: DB.FEE_RECORDS,
    ...(filter ? { filter } : {}),
    sorts: [{ property: 'Billing Month', direction: 'descending' }],
  } as any);

  return (res.results as PageObjectResponse[]).map(pageToFeeRecord);
}

export async function getFeeRecordById(id: string): Promise<FeeRecord> {
  const page = await notion().pages.retrieve({ page_id: id });
  return pageToFeeRecord(page as PageObjectResponse);
}

export async function ensureFeeRecord(data: {
  studentId: string;
  billingMonth: string;
  amountDue: number;
  dueDate: string;
}): Promise<FeeRecord> {
  const client = notion();

  const existing = await client.dataSources.query({
    data_source_id: DB.FEE_RECORDS,
    filter: {
      and: [
        { property: 'Student ID', rich_text: { equals: data.studentId } },
        { property: 'Billing Month', rich_text: { equals: data.billingMonth } },
      ],
    },
  } as any);

  if (existing.results.length > 0) {
    return pageToFeeRecord(existing.results[0] as PageObjectResponse);
  }

  const page = await client.pages.create({
    parent: { data_source_id: DB.FEE_RECORDS } as any,
    properties: {
      Title: { title: [{ text: { content: `${data.studentId} - ${data.billingMonth}` } }] },
      'Student ID': { rich_text: [{ text: { content: data.studentId } }] },
      'Billing Month': { rich_text: [{ text: { content: data.billingMonth } }] },
      'Amount Due': { number: data.amountDue },
      'Amount Paid': { number: 0 },
      'Due Date': { date: { start: data.dueDate } },
      Status: { select: { name: 'UPCOMING' } },
    },
  });
  return pageToFeeRecord(page as PageObjectResponse);
}

export async function updateFeeRecord(
  id: string,
  data: Partial<{
    amountPaid: number;
    status: string;
    paymentDate: string;
    paymentMethod: string;
    notes: string;
  }>
): Promise<FeeRecord> {
  const props: any = {};
  if (data.amountPaid !== undefined) props['Amount Paid'] = { number: data.amountPaid };
  if (data.status !== undefined) props['Status'] = { select: { name: data.status } };
  if (data.paymentDate !== undefined) props['Payment Date'] = { date: { start: data.paymentDate } };
  if (data.paymentMethod !== undefined) props['Payment Method'] = { select: { name: data.paymentMethod } };
  if (data.notes !== undefined) props['Notes'] = { rich_text: [{ text: { content: data.notes } }] };

  const page = await notion().pages.update({ page_id: id, properties: props });
  return pageToFeeRecord(page as PageObjectResponse);
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(studentId?: string): Promise<Payment[]> {
  const client = notion();
  const filter = studentId
    ? { property: 'Student ID', rich_text: { equals: studentId } }
    : undefined;

  const res = await client.dataSources.query({
    data_source_id: DB.PAYMENTS,
    ...(filter ? { filter } : {}),
    sorts: [{ property: 'Payment Date', direction: 'descending' }],
  } as any);

  return (res.results as PageObjectResponse[]).map(pageToPayment);
}

export async function recordPayment(data: {
  studentId: string;
  feeRecordId: string;
  studentName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}): Promise<Payment> {
  const page = await notion().pages.create({
    parent: { data_source_id: DB.PAYMENTS } as any,
    properties: {
      Title: {
        title: [{ text: { content: `${data.studentName} – ${data.paymentDate}` } }],
      },
      'Student ID': { rich_text: [{ text: { content: data.studentId } }] },
      'Fee Record ID': { rich_text: [{ text: { content: data.feeRecordId } }] },
      Amount: { number: data.amount },
      'Payment Date': { date: { start: data.paymentDate } },
      'Payment Method': { select: { name: data.paymentMethod } },
      Notes: { rich_text: [{ text: { content: data.notes || '' } }] },
    },
  });
  return pageToPayment(page as PageObjectResponse);
}

// ─── High-Level Helpers for UI Pages ──────────────────────────────────────────

export async function getFeeItemsForPeriodNotion(year: number, month: number) {
  const students = await getStudents(true);
  const feeRecords = await getFeeRecords();
  const targetBillingMonth = `${year}-${String(month).padStart(2, '0')}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const studentMap = new Map(students.map((s) => [s.id, s]));

  const periodRecords = feeRecords.filter((r) => r.billingMonth === targetBillingMonth);
  const recordStudentIds = new Set(periodRecords.map((r) => r.studentId));

  const items: Array<{
    id: string;
    studentId: string;
    studentName: string;
    guardianName: string | null;
    phone: string | null;
    className: string | null;
    billingYear: number;
    billingMonth: number;
    amountDue: string;
    dueDate: string;
    totalPaid: string;
    outstanding: string;
    status: FeeStatus;
  }> = [];

  for (const record of periodRecords) {
    const student = studentMap.get(record.studentId);
    const studentName = student ? student.name : 'Unknown Student';
    const guardianName = student?.guardianName ?? null;
    const phone = student?.phone ?? null;
    const className = student?.class ?? null;

    let computedStatus: FeeStatus = record.status;
    const outstandingVal = Math.max(0, record.amountDue - record.amountPaid);
    if (record.amountPaid >= record.amountDue && record.amountDue > 0) {
      computedStatus = 'PAID';
    } else if (record.amountPaid > 0) {
      computedStatus = 'PARTIALLY_PAID';
    } else if (record.dueDate && record.dueDate < todayStr) {
      computedStatus = 'OVERDUE';
    }

    items.push({
      id: record.id,
      studentId: record.studentId,
      studentName,
      guardianName,
      phone,
      className,
      billingYear: year,
      billingMonth: month,
      amountDue: String(record.amountDue),
      dueDate: record.dueDate,
      totalPaid: String(record.amountPaid),
      outstanding: String(outstandingVal),
      status: computedStatus,
    });
  }

  // Include active students without a fee record for this month
  for (const student of students) {
    if (student.status === 'ACTIVE' && !recordStudentIds.has(student.id)) {
      const dueDayStr = String(student.feeDueDay || 5).padStart(2, '0');
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${dueDayStr}`;
      const isOverdue = dueDate < todayStr;

      items.push({
        id: `draft-${student.id}`,
        studentId: student.id,
        studentName: student.name,
        guardianName: student.guardianName ?? null,
        phone: student.phone ?? null,
        className: student.class ?? null,
        billingYear: year,
        billingMonth: month,
        amountDue: String(student.monthlyFee),
        dueDate,
        totalPaid: '0',
        outstanding: String(student.monthlyFee),
        status: isOverdue ? 'OVERDUE' : 'UPCOMING',
      });
    }
  }

  return items;
}

export async function getDashboardSummaryNotion(year: number, month: number) {
  const students = await getStudents(true);
  const activeStudents = students.filter((s) => s.status === 'ACTIVE');
  const feeItems = await getFeeItemsForPeriodNotion(year, month);
  const payments = await getPayments();

  const studentMap = new Map(students.map((s) => [s.id, s]));

  let collectedSum = 0;
  let outstandingSum = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let partiallyPaidCount = 0;
  let dueCount = 0;
  let upcomingCount = 0;

  const needsAttention: any[] = [];

  for (const item of feeItems) {
    const paid = Number(item.totalPaid) || 0;
    const out = Number(item.outstanding) || 0;

    collectedSum += paid;
    outstandingSum += out;

    switch (item.status) {
      case 'PAID':
        paidCount++;
        break;
      case 'PARTIALLY_PAID':
        partiallyPaidCount++;
        needsAttention.push(item);
        break;
      case 'OVERDUE':
        overdueCount++;
        needsAttention.push(item);
        break;
      case 'DUE':
        dueCount++;
        needsAttention.push(item);
        break;
      case 'UPCOMING':
        upcomingCount++;
        break;
    }
  }

  const recentPayments = payments.slice(0, 5).map((p) => {
    const st = studentMap.get(p.studentId);
    return {
      id: p.id,
      studentId: p.studentId,
      studentName: st?.name || 'Student',
      className: st?.class || null,
      amount: String(p.amount),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      notes: p.notes ?? null,
      feeRecordId: p.feeRecordId,
    };
  });

  return {
    billingYear: year,
    billingMonth: month,
    activeStudentsCount: activeStudents.length,
    collectedThisMonth: String(collectedSum),
    outstandingThisMonth: String(outstandingSum),
    overdueCount,
    paidCount,
    partiallyPaidCount,
    dueCount,
    upcomingCount,
    hasFeeRecords: feeItems.length > 0,
    needsAttention,
    recentPayments,
  };
}

