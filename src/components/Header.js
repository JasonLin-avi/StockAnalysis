import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
                Antigravity Analytics
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                市場看板
              </Link>
              <Link href="/reports" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                分析報告
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500 font-mono hidden sm:block">
              v1.0.0
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
