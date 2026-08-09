'use client';

/**
 * EmbeddedBacktestPanel Component
 *
 * Point-in-time LLM technical analysis backtest sandbox embedded in stock detail tabs.
 * Automatically accepts `symbol` prop and provides Cutoff Date picker, Prediction Horizon selector
 * (with custom days input support), Predict/Evaluate API triggers, and Result Cards rendering.
 */

import React, { useState } from 'react';
import ResultCards from './ResultCards';

export default function EmbeddedBacktestPanel({ symbol }) {
  // Default cutoff date: 6 months ago
  const defaultCutoff = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  };

  const [cutoffDate, setCutoffDate] = useState(defaultCutoff);
  const [lookbackOption, setLookbackOption] = useState('60');
  const [customLookbackDays, setCustomLookbackDays] = useState(90);
  const [horizonOption, setHorizonOption] = useState('20');
  const [customDays, setCustomDays] = useState(45);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const activeLookbackDays =
    lookbackOption === 'custom' ? parseInt(customLookbackDays, 10) || 60 : parseInt(lookbackOption, 10);

  const activePredictionDays =
    horizonOption === 'custom' ? parseInt(customDays, 10) || 20 : parseInt(horizonOption, 10);

  const handlePredict = async () => {
    if (!cutoffDate || !activePredictionDays) return;
    setLoading(true);
    setForecast(null);
    setEvaluation(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/backtest/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, cutoffDate, lookbackDays: activeLookbackDays })
      });
      const data = await res.json();
      if (data.success) {
        setForecast(data.forecast);
      } else {
        setErrorMsg(data.error || '預測服務發生錯誤');
      }
    } catch (err) {
      console.error('Prediction API call failed:', err);
      setErrorMsg('無法連接預測服務，請檢查網路連線或重試');
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    if (!forecast) return;
    setEvaluating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/backtest/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          cutoffDate,
          predictionDays: activePredictionDays,
          predictionResult: forecast
        })
      });
      const data = await res.json();
      if (data.success) {
        setEvaluation(data.evaluation);
      } else {
        setErrorMsg(data.error || '評估服務發生錯誤');
      }
    } catch (err) {
      console.error('Evaluation API call failed:', err);
      setErrorMsg('無法連接評估服務，請檢查網路連線或重試');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="border border-slate-900 bg-slate-900/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6 space-y-6">
      {/* Upper Section: Stacked Full-Width Title Row & Control Bar */}
      <div className="border-b border-slate-800/80 pb-6 space-y-4">
        {/* Row 1: Full-Width Title & Subtitle */}
        <div className="flex items-start gap-3 w-full">
          <span className="text-2xl mt-0.5">⏳</span>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              歷史時點 AI 技術回測沙盒 ({symbol})
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              指定歷史基準日期，LLM 將在完全遮蔽未來價格與新聞的情況下進行技術面分析，並於揭曉後自動計算精準度評分
            </p>
          </div>
        </div>

        {/* Row 2: Compact Stacked Control Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-end justify-start gap-4 sm:gap-6 w-full">
          <div className="flex flex-col gap-1">
            <label htmlFor="embedded-cutoff-date" className="text-xs text-slate-400 font-medium">
              歷史基準日 (Cutoff Date)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="embedded-cutoff-date"
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 [color-scheme:dark]"
              />
              <div className="hidden sm:flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 1);
                    setCutoffDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-700/60"
                >
                  1M
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 3);
                    setCutoffDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-700/60"
                >
                  3M
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 6);
                    setCutoffDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-700/60"
                >
                  6M
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() - 1);
                    setCutoffDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-700/60"
                >
                  1Y
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="embedded-lookback-select" className="text-xs text-slate-400 font-medium">
              歷史參考長度 (Lookback)
            </label>
            <select
              id="embedded-lookback-select"
              value={lookbackOption}
              onChange={(e) => setLookbackOption(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="5">1 週 (5 個交易日)</option>
              <option value="20">1 個月 (20 個交易日)</option>
              <option value="60">3 個月 (60 個交易日)</option>
              <option value="custom">自訂天數 (Other)</option>
            </select>
          </div>

          {lookbackOption === 'custom' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="custom-lookback-input" className="text-xs text-slate-400 font-medium">
                自訂參考天數
              </label>
              <input
                id="custom-lookback-input"
                type="number"
                min="1"
                max="240"
                value={customLookbackDays}
                onChange={(e) => setCustomLookbackDays(e.target.value)}
                placeholder="參考天數"
                className="w-16 bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="horizon-option-select" className="text-xs text-slate-400 font-medium">
              預測展望時間
            </label>
            <select
              id="horizon-option-select"
              value={horizonOption}
              onChange={(e) => setHorizonOption(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="5">1 週 (5 個交易日)</option>
              <option value="20">1 個月 (20 個交易日)</option>
              <option value="60">3 個月 (60 個交易日)</option>
              <option value="custom">自訂天數 (Other)</option>
            </select>
          </div>

          {horizonOption === 'custom' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="custom-days-input" className="text-xs text-slate-400 font-medium">
                自訂交易日數
              </label>
              <input
                id="custom-days-input"
                type="number"
                min="1"
                max="240"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="輸入天數"
                className="w-16 bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          )}

          <button
            onClick={handlePredict}
            disabled={loading || !cutoffDate}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>分析中...</span>
              </>
            ) : (
              <span>🚀 開始歷史時點回測</span>
            )}
          </button>
        </div>
      </div>

      {/* Loading State matching 15-Year Quant Expert Panel */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-slate-400 font-medium animate-pulse">
            AI 量化專家正在對 {symbol} (基準日 {cutoffDate}) 進行歷史時點數據與 K 線指標深度分析...
          </span>
        </div>
      )}

      {/* Error Alert View */}
      {errorMsg && !loading && (
        <div className="border border-red-900/50 bg-red-950/20 rounded-2xl p-8 text-center my-4">
          <div className="text-red-400 text-sm font-semibold mb-1">無法載入 AI 回測診斷報告</div>
          <div className="text-xs text-slate-400 mb-4">{errorMsg}</div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-300 font-medium transition-colors cursor-pointer"
          >
            關閉提示
          </button>
        </div>
      )}

      {/* Generated Forecast Output */}
      {!loading && forecast && (
        <ResultCards
          forecast={forecast}
          evaluation={evaluation}
          onReveal={handleReveal}
          evaluating={evaluating}
        />
      )}

      {/* Initial Unfetched Prompt Area (Clean & Borderless) */}
      {!loading && !errorMsg && !forecast && (
        <div className="text-center py-12 text-slate-400 text-sm font-medium">
          請選擇歷史基準日並點擊「🚀 開始歷史時點回測」開始生成分析報告
        </div>
      )}
    </div>
  );
}
