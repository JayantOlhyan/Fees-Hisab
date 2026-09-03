import { Client } from '@notionhq/client';

export const NOTION_DATABASE_IDS = {
  STUDENTS: process.env.NOTION_STUDENTS_DATABASE_ID || '164f946d-c40d-4f80-bd89-d37ca8f525b6',
  FEE_RECORDS: process.env.NOTION_FEE_RECORDS_DATABASE_ID || 'f1c9ff42-549a-49de-9325-83c7e4ac8527',
  PAYMENTS: process.env.NOTION_PAYMENTS_DATABASE_ID || '67d7ede3-e368-4855-a121-e2cf8064c187',
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
