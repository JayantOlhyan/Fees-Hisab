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
    parent: { database_id: DB.STUDENTS },
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
    parent: { database_id: DB.FEE_RECORDS },
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
    parent: { database_id: DB.PAYMENTS },
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
