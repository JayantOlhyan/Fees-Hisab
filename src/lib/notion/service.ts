import { getNotionClient, NOTION_DATABASE_IDS, isNotionConfigured } from './client';
import { Student, FeeRecord, Payment } from '@/types';

export class NotionService {
  /**
   * Syncs a student to Notion
   */
  static async syncStudent(student: Student): Promise<string | null> {
    if (!isNotionConfigured()) return null;
    try {
      const notion = getNotionClient();
      const res = await notion.pages.create({
        parent: { data_source_id: NOTION_DATABASE_IDS.STUDENTS } as any,
        properties: {
          Name: {
            title: [{ text: { content: student.name } }],
          },
          Class: {
            rich_text: [{ text: { content: student.class || '' } }],
          },
          School: {
            rich_text: [{ text: { content: student.school || '' } }],
          },
          'Monthly Fee': {
            number: Number(student.monthlyFee),
          },
          'Fee Due Day': {
            number: student.feeDueDay,
          },
          'Guardian Name': {
            rich_text: [{ text: { content: student.guardianName || '' } }],
          },
          Phone: {
            phone_number: student.phone || null,
          },
          Status: {
            select: { name: student.status || 'ACTIVE' },
          },
          Notes: {
            rich_text: [{ text: { content: student.notes || '' } }],
          },
        },
      });
      return res.id;
    } catch (err: any) {
      console.warn('Failed to sync student to Notion:', err.message || err);
      return null;
    }
  }

  /**
   * Syncs a payment to Notion
   */
  static async syncPayment(payment: Payment, studentName?: string): Promise<string | null> {
    if (!isNotionConfigured()) return null;
    try {
      const notion = getNotionClient();
      const refTitle = `Payment - ${studentName || 'Student'} - ${payment.paymentDate}`;
      const res = await notion.pages.create({
        parent: { data_source_id: NOTION_DATABASE_IDS.PAYMENTS } as any,
        properties: {
          'Payment Reference': {
            title: [{ text: { content: refTitle } }],
          },
          Amount: {
            number: Number(payment.amount),
          },
          'Payment Date': {
            date: { start: payment.paymentDate },
          },
          'Payment Method': {
            select: { name: payment.paymentMethod || 'CASH' },
          },
          Notes: {
            rich_text: [{ text: { content: payment.notes || '' } }],
          },
        },
      });
      return res.id;
    } catch (err: any) {
      console.warn('Failed to sync payment to Notion:', err.message || err);
      return null;
    }
  }
}
