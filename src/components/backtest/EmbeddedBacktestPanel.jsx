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
  const [horizonOption, setHorizonOption] = useState('20');
  const [customDays, setCustomDays] = useState(45);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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
        body: JSON.stringify({ symbol, cutoffDate, lookbackDays: 90 })
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
    <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-xl">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>⏳</span> 歷史時點 AI 技術回測沙盒 ({symbol})
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          指定歷史基準日期，LLM 將在完全遮蔽未來價格與新聞的情況下進行技術面分析，並於揭曉後自動計算精準度評分。
        </p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="embedded-cutoff-date" className="block text-xs font-medium text-slate-400 mb-1">
              歷史基準日 (Cutoff Date)
            </label>
            <input
              id="embedded-cutoff-date"
              type="date"
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

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
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? '⏳ LLM 時點分析中...' : '🚀 開始歷史時點回測'}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6 text-rose-400 text-sm flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white font-bold text-xs px-2 py-1"
          >
            關閉
          </button>
        </div>
      )}

      <ResultCards
        forecast={forecast}
        evaluation={evaluation}
        onReveal={handleReveal}
        evaluating={evaluating}
      />
    </div>
  );
}
