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
    <div className="w-full space-y-6">
      {/* Upper Control Bar Card */}
      <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>⏳</span> 歷史時點 AI 技術回測沙盒 ({symbol})
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            指定歷史基準日期，LLM 將在完全遮蔽未來價格與新聞的情況下進行技術面分析，並於揭曉後自動計算精準度評分。
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[180px]">
              <label htmlFor="embedded-cutoff-date" className="block text-xs font-medium text-slate-400 mb-1">
                歷史基準日 (Cutoff Date)
              </label>
              <div className="space-y-1.5">
                <input
                  id="embedded-cutoff-date"
                  type="date"
                  value={cutoffDate}
                  onChange={(e) => setCutoffDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]"
                />
                <div className="flex flex-wrap gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - 1);
                      setCutoffDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
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
                    className="px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
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
                    className="px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
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
                    className="px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    1年前
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label htmlFor="embedded-lookback-select" className="block text-xs font-medium text-slate-400 mb-1">
                歷史參考長度 (Lookback)
              </label>
              <select
                id="embedded-lookback-select"
                value={lookbackOption}
                onChange={(e) => setLookbackOption(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="5">1 週 (5 個交易日)</option>
                <option value="20">1 個月 (20 個交易日)</option>
                <option value="60">3 個月 (60 個交易日)</option>
                <option value="custom">自訂天數 (Other)</option>
              </select>
            </div>

            {lookbackOption === 'custom' && (
              <div className="w-[120px]">
                <label htmlFor="custom-lookback-input" className="block text-xs font-medium text-slate-400 mb-1">
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
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            )}

            <div className="flex-1 min-w-[180px]">
              <label htmlFor="horizon-option-select" className="block text-xs font-medium text-slate-400 mb-1">
                預測展望時間
              </label>
              <select
                id="horizon-option-select"
                value={horizonOption}
                onChange={(e) => setHorizonOption(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="5">1 週 (5 個交易日)</option>
                <option value="20">1 個月 (20 個交易日)</option>
                <option value="60">3 個月 (60 個交易日)</option>
                <option value="custom">自訂天數 (Other)</option>
              </select>
            </div>

            {horizonOption === 'custom' && (
              <div className="w-[120px]">
                <label htmlFor="custom-days-input" className="block text-xs font-medium text-slate-400 mb-1">
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
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            )}

            <div className="flex-none self-end">
              <button
                onClick={handlePredict}
                disabled={loading || !cutoffDate}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all duration-200 shadow-md hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>⏳ LLM 時點分析中...</span>
                  </>
                ) : (
                  <span>🚀 開始歷史時點回測</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area Card (Identical Full-Width Layout matching 15-Year Quant Expert Panel) */}
      <div className="border border-slate-900 bg-slate-900/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {symbol} 歷史時點 ({cutoffDate}) 15年資深量化專家 AI 回測診斷
              </h3>
              <p className="text-xs text-slate-500">由 Google Gemini 遮蔽未來 K 線進行盲測與點位推理</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
            <span>參考: {activeLookbackDays} 天</span>
            <span>|</span>
            <span>展望: {activePredictionDays} 天</span>
          </div>
        </div>

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

        {errorMsg && !loading && (
          <div className="border border-red-900/50 bg-red-950/20 rounded-2xl p-8 text-center">
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

        {!loading && forecast && (
          <ResultCards
            forecast={forecast}
            evaluation={evaluation}
            onReveal={handleReveal}
            evaluating={evaluating}
          />
        )}

        {!loading && !errorMsg && !forecast && (
          <div className="text-center py-12 text-slate-500 text-sm font-medium border border-dashed border-slate-800 rounded-xl">
            請設定歷史基準日與預測展望時間，並點擊「🚀 開始歷史時點回測」開始生成分析報告
          </div>
        )}
      </div>
    </div>
  );
}
