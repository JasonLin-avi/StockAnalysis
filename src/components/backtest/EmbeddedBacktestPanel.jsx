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
        <div className="flex items-start gap-3.5 w-full">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
              <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-96-88a12,12,0,1,1-12-12A12,12,0,0,1,112,120Zm48,0a12,12,0,1,1-12-12A12,12,0,0,1,160,120Zm-48,48a12,12,0,1,1-12-12A12,12,0,0,1,112,168Zm48,0a12,12,0,1,1-12-12A12,12,0,0,1,160,168Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                歷史時點 AI 技術回測沙盒 ({symbol})
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                Point-In-Time Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              指定歷史基準日期，LLM 將在完全遮蔽未來價格與新聞的情況下進行技術面分析，並於揭曉後自動計算精準度評分
            </p>
          </div>
        </div>

        {/* Row 2: Split Header/Footer Control Bar Layout */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4.5 w-full shadow-inner">
          {/* Top Parameters Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="embedded-cutoff-date" className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-cyan-400" viewBox="0 0 256 256">
                  <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
                </svg>
                歷史基準日 (Cutoff Date)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="embedded-cutoff-date"
                  type="date"
                  value={cutoffDate}
                  onChange={(e) => setCutoffDate(e.target.value)}
                  className="bg-slate-950 text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors [color-scheme:dark] flex-1"
                />
                <div className="hidden sm:flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - 1);
                      setCutoffDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-medium"
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
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-medium"
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
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-medium"
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
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-medium"
                  >
                    1Y
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="embedded-lookback-select" className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-cyan-400" viewBox="0 0 256 256">
                  <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" />
                </svg>
                歷史參考長度 (Lookback)
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="embedded-lookback-select"
                  value={lookbackOption}
                  onChange={(e) => setLookbackOption(e.target.value)}
                  className="bg-slate-950 text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors flex-1"
                >
                  <option value="5">1 週 (5 個交易日)</option>
                  <option value="20">1 個月 (20 個交易日)</option>
                  <option value="60">3 個月 (60 個交易日)</option>
                  <option value="custom">自訂天數 (Other)</option>
                </select>
                {lookbackOption === 'custom' && (
                  <input
                    id="custom-lookback-input"
                    type="number"
                    min="1"
                    max="240"
                    value={customLookbackDays}
                    onChange={(e) => setCustomLookbackDays(e.target.value)}
                    placeholder="參考天數"
                    className="w-20 bg-slate-950 text-slate-100 text-xs rounded-lg px-2.5 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="horizon-option-select" className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-cyan-400" viewBox="0 0 256 256">
                  <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
                </svg>
                預測展望時間
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="horizon-option-select"
                  value={horizonOption}
                  onChange={(e) => setHorizonOption(e.target.value)}
                  className="bg-slate-950 text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors flex-1"
                >
                  <option value="5">1 週 (5 個交易日)</option>
                  <option value="20">1 個月 (20 個交易日)</option>
                  <option value="60">3 個月 (60 個交易日)</option>
                  <option value="custom">自訂天數 (Other)</option>
                </select>
                {horizonOption === 'custom' && (
                  <input
                    id="custom-days-input"
                    type="number"
                    min="1"
                    max="240"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="輸入天數"
                    className="w-20 bg-slate-950 text-slate-100 text-xs rounded-lg px-2.5 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action Trigger Button Area */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={handlePredict}
              disabled={loading || !cutoffDate}
              className="w-full py-2.5 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-600 hover:from-cyan-400 hover:via-blue-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>分析中...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M235.6,28.4a8,8,0,0,0-7.2-4.4A152.06,152.06,0,0,0,76.4,76.4a154.21,154.21,0,0,0-23.7,35.9,8,8,0,0,0,3.6,10.6,151.72,151.72,0,0,0,51.8,17,8,8,0,0,0,8.7-5,136.31,136.31,0,0,1,16.5-27,8,8,0,0,1,11.3-2.3,8.21,8.21,0,0,1,2.3,11.3,151.48,151.48,0,0,0-18,29.8,8,8,0,0,0,4.8,10.2A151.87,151.87,0,0,0,183.6,168a8,8,0,0,0,7.9-7.9,152.06,152.06,0,0,0,44.1-124.5A8,8,0,0,0,235.6,28.4Z" />
                  </svg>
                  <span>開始歷史時點回測</span>
                </>
              )}
            </button>
          </div>
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
