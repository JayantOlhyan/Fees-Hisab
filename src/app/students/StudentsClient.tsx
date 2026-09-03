'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  ChevronRight,
  GraduationCap,
  Users,
  Phone,
  School,
  Calendar,
  MoreVertical,
  Eye,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { formatINR, formatDateReadable } from '@/lib/utils';
import { archiveStudentAction, restoreStudentAction } from '@/actions/student.actions';
import { useRouter } from 'next/navigation';

export interface StudentListItem {
  id: string;
  name: string;
  guardianName: string | null;
  phone: string | null;
  className: string;
  school: string | null;
  subjects: string[];
  monthlyFee: string;
  feeDueDay: number;
  joiningDate: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

interface StudentsClientProps {
  initialStudents: StudentListItem[];
}

type StatusFilter = 'ACTIVE' | 'ARCHIVED' | 'ALL';

export const StudentsClient: React.FC<StudentsClientProps> = ({ initialStudents }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Derive unique classes
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    initialStudents.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [initialStudents]);

  // Search & Filter pipeline
  const filteredStudents = useMemo(() => {
    return initialStudents.filter((s) => {
      // 1. Status Filter
      if (statusFilter === 'ACTIVE' && s.status !== 'ACTIVE') return false;
      if (statusFilter === 'ARCHIVED' && s.status !== 'ARCHIVED') return false;

      // 2. Class Filter
      if (classFilter !== 'ALL' && s.className !== classFilter) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesGuardian = s.guardianName?.toLowerCase().includes(q);
        const matchesPhone = s.phone?.includes(q);
        const matchesClass = s.className.toLowerCase().includes(q);
        const matchesSchool = s.school?.toLowerCase().includes(q);

        if (!matchesName && !matchesGuardian && !matchesPhone && !matchesClass && !matchesSchool) {
          return false;
        }
      }

      return true;
    });
  }, [initialStudents, statusFilter, classFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header (Exact Match to Design Mockup) */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Students</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your students in one place.</p>
        </div>

        <Link
          href="/students/new"
          className="flex items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Student</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, guardian, phone, class or school..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 shadow-2xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Select */}
          <div className="flex items-center bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium mr-2">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by student status"
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="ALL">All</option>
            </select>
          </div>

          {/* Class Select */}
          {uniqueClasses.length > 0 && (
            <div className="flex items-center bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs shadow-2xs">
              <span className="text-slate-400 font-medium mr-2">Class:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                aria-label="Filter by class"
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View (lg screens) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-16 text-center">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">
              {searchQuery ? 'No matching students found' : 'Your student list is empty.'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try searching with a different name, phone number, or class.'
                : 'Add your first student to start managing fees with ease.'}
            </p>
            {!searchQuery && (
              <Link
                href="/students/new"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add your first student</span>
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Subjects</th>
                <th className="py-3 px-4 text-right">Monthly Fee</th>
                <th className="py-3 px-4 text-center">Due Day</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/60 transition group">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-100 flex-shrink-0">
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <Link
                          href={`/students/${st.id}`}
                          className="font-bold text-slate-900 group-hover:text-emerald-600 transition"
                        >
                          {st.name}
                        </Link>
                        {st.guardianName && (
                          <span className="text-[11px] text-slate-400 block">
                            {st.guardianName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-700">{st.className}</td>

                  <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">
                    {st.subjects.join(', ')}
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {formatINR(Number(st.monthlyFee))}
                  </td>

                  <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                    {st.feeDueDay}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                    {st.phone || '—'}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {st.status === 'ACTIVE' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        ARCHIVED
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/students/${st.id}`}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/students/${st.id}/edit`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Student"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile & Tablet Card View (< lg screens) */}
      <div className="lg:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 text-sm">
              {searchQuery ? 'No matching students found' : 'Your student list is empty.'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'Try a different search query'
                : 'Add your first student to get started!'}
            </p>
          </div>
        ) : (
          filteredStudents.map((st) => (
            <Link
              key={st.id}
              href={`/students/${st.id}`}
              className="block bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:border-emerald-300 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 font-extrabold text-sm flex items-center justify-center border border-emerald-100 flex-shrink-0">
                    {st.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{st.name}</h4>
                      {st.status === 'ARCHIVED' && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.2 rounded-full">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {st.className} · {formatINR(Number(st.monthlyFee))} · Due {st.feeDueDay}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
