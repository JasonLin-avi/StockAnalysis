'use client';

/**
 * ControlPanel Component
 * 
 * Provides interactive inputs for selecting stock symbol, cutoff date, and preset cases.
 * Encapsulating controls in a dedicated bar allows clean state management and reuse across backtesting views.
 */

import React from 'react';

export default function ControlPanel({ symbol, setSymbol, cutoffDate, setCutoffDate, onSubmit, loading }) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="stock-symbol-input" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-cyan-400" viewBox="0 0 256 256">
              <path d="M224,120v40a8,8,0,0,1-16,0V139.31l-42.34,42.35a8,8,0,0,1-11.32,0L128,155.31l-42.34,42.35a8,8,0,0,1-11.32-11.32l48-48a8,8,0,0,1,11.32,0L160,164.69,196.69,128H176a8,8,0,0,1,0-16h40A8,8,0,0,1,224,120Z" />
            </svg>
            股票代碼 (Stock Symbol)
          </label>
          <input
            id="stock-symbol-input"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="例如: 2330.TW, NVDA, TSLA"
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors font-mono"
          />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="cutoff-date-input" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-cyan-400" viewBox="0 0 256 256">
              <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
            </svg>
            歷史基準日 (Cutoff Date)
          </label>
          <div className="space-y-2">
            <input
              id="cutoff-date-input"
              type="date"
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors [color-scheme:dark]"
            />
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 1);
                  setCutoffDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-medium"
              >
                1個月前
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 3);
                  setCutoffDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-medium"
              >
                3個月前
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 6);
                  setCutoffDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-medium"
              >
                6個月前
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() - 1);
                  setCutoffDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-medium"
              >
                1年前
              </button>
            </div>
          </div>
        </div>
        <div className="flex-none self-end">
          <button
            onClick={onSubmit}
            disabled={loading || !symbol || !cutoffDate}
            className="bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-600 hover:from-cyan-400 hover:via-blue-500 hover:to-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
          >
            {loading ? '⏳ LLM 歷史時點分析中...' : '開始歷史回測分析'}
          </button>
        </div>
      </div>
    </div>
  );
}
