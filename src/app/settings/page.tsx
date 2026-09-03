'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Download, 
  Upload, 
  RefreshCw, 
  ShieldCheck, 
  User, 
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { 
  getSettings, 
  saveSettings, 
  exportAllData, 
  importAllData, 
  resetToSeedData,
  getStudents,
  getFeeRecords,
  getPayments
} from '@/lib/storage';
import Image from 'next/image';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [salutation, setSalutation] = useState<'Ma\'am' | 'Sir' | 'Teacher'>('Ma\'am');
  const [saveMessage, setSaveMessage] = useState('');
  const [importStatus, setImportStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    setMounted(true);
    const s = getSettings();
    setTeacherName(s.teacherName);
    setSalutation(s.salutation);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings({
      teacherName: teacherName.trim() || 'Sunita Sharma',
      salutation,
      currency: '₹',
    });
    setSaveMessage('Settings updated successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleExportJSON = () => {
    const dataStr = exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees_hisab_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const students = getStudents();
    const feeRecords = getFeeRecords();
    const payments = getPayments();

    // Students CSV
    let csv = 'Student Name,Class,Phone,Monthly Fee,Fee Due Day,Status\n';
    students.forEach((s) => {
      csv += `"${s.name}","${s.class}","${s.phone || ''}",${s.monthlyFee},${s.feeDueDay},"${s.status}"\n`;
    });

    csv += '\n\nBilling Month,Student ID,Amount Due,Amount Paid,Status,Due Date\n';
    feeRecords.forEach((r) => {
      csv += `"${r.billingMonth}","${r.studentId}",${r.amountDue},${r.amountPaid},"${r.status}","${r.dueDate}"\n`;
    });

    csv += '\n\nPayment Date,Student ID,Amount,Payment Method,Notes\n';
    payments.forEach((p) => {
      csv += `"${p.paymentDate}","${p.studentId}",${p.amount},"${p.paymentMethod}","${p.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees_hisab_records_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = importAllData(text);
        if (success) {
          setImportStatus('success');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setImportStatus('error');
        }
      } catch {
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    const confirmed = confirm(
      'Reset all data back to original sample demo records? Any new changes will be replaced.'
    );
    if (confirmed) {
      resetToSeedData();
      alert('Demo data restored!');
      window.location.reload();
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-5">
        {/* Header */}
        <div className="pb-4 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings & Backup</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your profile, backup your data, and export records
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs hidden sm:block relative">
            <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
          </div>
        </div>

        {/* Section 1: Teacher Profile */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-emerald-600" />
            Teacher Profile & Greeting
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            {saveMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {saveMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Teacher Name</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="e.g. Sunita Sharma"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dashboard Salutation / Title
              </label>
              <select
                value={salutation}
                onChange={(e) => setSalutation(e.target.value as 'Ma\'am' | 'Sir' | 'Teacher')}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
              >
                <option value="Ma'am">Good afternoon, Ma'am</option>
                <option value="Sir">Good afternoon, Sir</option>
                <option value="Teacher">Good afternoon, Teacher</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Save Profile
            </button>
          </form>
        </div>

        {/* Section 2: Data Safety & Backup (PRD Section 23) */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Data Backup & Restore
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Your fee records are stored securely on your browser. You can export a backup at any time or restore from an existing file.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export JSON */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  Full Data Backup (JSON)
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Exports all students, monthly fee records, payments, and settings in a single JSON backup.
                </p>
              </div>
              <button
                onClick={handleExportJSON}
                className="mt-3 w-full py-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-xs font-bold rounded-xl transition"
              >
                Download JSON Backup
              </button>
            </div>

            {/* Export CSV */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Spreadsheet Export (CSV)
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Export your student register and payments to open in Microsoft Excel or Google Sheets.
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                className="mt-3 w-full py-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-xs font-bold rounded-xl transition"
              >
                Download CSV Sheets
              </button>
            </div>
          </div>

          {/* Import / Restore */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 mb-1">
              <Upload className="w-4 h-4 text-slate-700" />
              Restore Data from Backup
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Upload a previously exported JSON backup file to restore all your fee records.
            </p>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                <span>Choose Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              {importStatus === 'success' && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Restored successfully! Reloading...
                </span>
              )}
              {importStatus === 'error' && (
                <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Invalid backup file
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Reset Demo Data */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-slate-600" />
            Sample Demo Data
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Want to see how the app looks with sample students (Rahul Sharma, Ananya Gupta, etc.)?
          </p>
          <button
            onClick={handleResetData}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Reset to Sample Tuition Data
          </button>
        </div>
      </main>
    </div>
  );
}
