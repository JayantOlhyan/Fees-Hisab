import { Client } from '@notionhq/client';

export const DB = {
  STUDENTS: process.env.NOTION_STUDENTS_DATABASE_ID || '24da4cc5-aab0-4c0b-a7d2-2aa6cd42cd05',
  FEE_RECORDS: process.env.NOTION_FEE_RECORDS_DATABASE_ID || '590b5d2c-962a-46bf-9a49-b15f831b25f6',
  PAYMENTS: process.env.NOTION_PAYMENTS_DATABASE_ID || '9f072bb8-6dbc-48b3-be36-ca66c6cd0aa4',
};

let _notion: Client | null = null;
export function notion(): Client {
  if (!_notion) {
    const key = process.env.NOTION_API_KEY;
    if (!key) throw new Error('NOTION_API_KEY is not set in .env.local');
    _notion = new Client({ auth: key });
  }
  return _notion;
}
