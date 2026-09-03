import { Client } from '@notionhq/client';

export const NOTION_DATABASE_IDS = {
  STUDENTS: process.env.NOTION_STUDENTS_DATABASE_ID || '24da4cc5-aab0-4c0b-a7d2-2aa6cd42cd05',
  FEE_RECORDS: process.env.NOTION_FEE_RECORDS_DATABASE_ID || '590b5d2c-962a-46bf-9a49-b15f831b25f6',
  PAYMENTS: process.env.NOTION_PAYMENTS_DATABASE_ID || '9f072bb8-6dbc-48b3-be36-ca66c6cd0aa4',
};

let notionClient: Client | null = null;

export function getNotionClient(): Client {
  if (!notionClient) {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error(
        'NOTION_API_KEY environment variable is missing. Please add it to your .env.local'
      );
    }
    notionClient = new Client({ auth: apiKey });
  }
  return notionClient;
}

export function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_API_KEY);
}
