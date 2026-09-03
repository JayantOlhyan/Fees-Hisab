import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { DashboardService } from '@/services/dashboard/dashboard.service';
import DashboardClient from './DashboardClient';

interface DashboardPageProps {
  searchParams?: Promise<{ year?: string; month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const now = new Date();

  // Authoritative server-side period determination
  const year = resolvedSearchParams.year
    ? parseInt(resolvedSearchParams.year, 10)
    : now.getFullYear();
  const month = resolvedSearchParams.month
    ? parseInt(resolvedSearchParams.month, 10)
    : now.getMonth() + 1;

  const summary = await DashboardService.getDashboardSummary(session.userId, year, month);

  return <DashboardClient summary={summary} />;
}
