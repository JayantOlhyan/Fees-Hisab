import React from 'react';
import { Navigation } from '@/components/Navigation';
import { FeesClient, FeeItem } from './FeesClient';
import { FeeService } from '@/services/fees/fee.service';
import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

interface FeesPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function FeesPage({ searchParams }: FeesPageProps) {
  const session = await requireAuth();


  const params = await searchParams;
  const now = new Date();
  const currentYear = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const currentMonth = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;

  let feeRecords: FeeItem[] = [];
  try {
    const { getFeeItemsForPeriodNotion } = await import('@/lib/notion/service');
    feeRecords = await getFeeItemsForPeriodNotion(currentYear, currentMonth);
  } catch {
    feeRecords = [];
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5">
        <FeesClient
          initialFees={feeRecords}
          currentYear={currentYear}
          currentMonth={currentMonth}
        />
      </main>
    </div>
  );
}
