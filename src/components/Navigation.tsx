'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Receipt, BarChart3, Settings, Plus } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface NavigationProps {
  onOpenAddStudent?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onOpenAddStudent }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Students', href: '/students', icon: Users },
    { label: 'Fees', href: '/fees', icon: Receipt },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white min-h-screen sticky top-0 z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-emerald-50">
            <Image src="/logo.jpg" alt="Fees Hisab Logo" fill className="object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
              Fees<span className="text-emerald-600">Hisab</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Har Fee. Har Student.</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4">
          {onOpenAddStudent ? (
            <button
              onClick={onOpenAddStudent}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-200 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          ) : (
            <Link
              href="/students/new"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-200 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </Link>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive ? 'text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktopActiveNav"
                    className="absolute inset-0 bg-emerald-50 rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Tagline */}
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
          Pure Hisab · V1.0
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveNav"
                  className="absolute inset-0 bg-emerald-50 border border-emerald-100 rounded-xl"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'stroke-[2.25px]' : 'stroke-[1.75px]'}`} />
              <span className="text-[11px] mt-0.5 relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
