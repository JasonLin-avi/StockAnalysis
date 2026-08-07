'use client';

/**
 * ControlPanel Component
 * 
 * Provides interactive inputs for selecting stock symbol, cutoff date, and preset cases.
 * Encapsulating controls in a dedicated bar allows clean state management and reuse across backtesting views.
 */

import React from 'react';

export default function ControlPanel({ symbol, setSymbol, cutoffDate, setCutoffDate, presets, selectedPresetId, onSelectPreset, onSubmit, loading }) {
  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-6 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="stock-symbol-input" className="block text-xs font-medium text-slate-400 mb-1">
            股票代碼 (Stock Symbol)
          </label>
          <input
            id="stock-symbol-input"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="例如: 2330.TW, NVDA"
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="cutoff-date-input" className="block text-xs font-medium text-slate-400 mb-1">
            歷史基準日 (Cutoff Date)
          </label>
          <input
            id="cutoff-date-input"
            type="date"
            value={cutoffDate}
            onChange={(e) => setCutoffDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        {presets && presets.length > 0 && (
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="preset-select" className="block text-xs font-medium text-slate-400 mb-1">
              快速載入經典範例 (選填)
            </label>
            <select
              id="preset-select"
              value={selectedPresetId || ''}
              onChange={(e) => {
                const presetId = e.target.value;
                if (!presetId) {
                  onSelectPreset(null);
                } else {
                  const preset = presets.find((p) => p.id === presetId);
                  if (preset) onSelectPreset(preset);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">-- 自訂輸入標的與日期 --</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  📌 {p.title} ({p.symbol})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-none self-end">
          <button
            onClick={onSubmit}
            disabled={loading || !symbol || !cutoffDate}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'LLM 分析中...' : '開始歷史回測分析'}
          </button>
        </div>
      </div>
    </div>
  );
}
