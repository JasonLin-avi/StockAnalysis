'use client';

/**
 * Interactive K-Line LLM Backtesting & Validation Sandbox Page
 * 
 * Allows users to simulate point-in-time stock analysis by setting a cutoff date.
 * Prevents lookahead data leakage by presenting only historical data to Predictor LLM,
 * then reveals real outcome data for Evaluator LLM scoring.
 */

import React, { useState, useEffect } from 'react';
import ControlPanel from '@/components/backtest/ControlPanel';
import ResultCards from '@/components/backtest/ResultCards';

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('2330.TW');
  const [cutoffDate, setCutoffDate] = useState('2024-03-01');
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch preset scenarios on component mount
  useEffect(() => {
    fetch('/api/backtest/presets')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.presets)) {
          setPresets(data.presets);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch backtest presets:', err);
      });
  }, []);

  const handleSelectPreset = (preset) => {
    setSymbol(preset.symbol);
    setCutoffDate(preset.cutoffDate);
    setErrorMsg(null);
  };

  const handlePredict = async () => {
    if (!symbol || !cutoffDate) return;
    setLoading(true);
    setForecast(null);
    setEvaluation(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/backtest/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, cutoffDate })
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
        body: JSON.stringify({ symbol, cutoffDate, predictionResult: forecast })
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📈</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              K 線 LLM 歷史時點回測與驗證沙盒
            </h1>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            設定過去的指定時間點 (Cutoff Date)，體驗 AI 在完全無未來資訊下進行 K 線技術分析，揭曉真實未來走勢並由裁判 LLM 進行回測精準度對比評分。
          </p>
        </header>

        <ControlPanel
          symbol={symbol}
          setSymbol={setSymbol}
          cutoffDate={cutoffDate}
          setCutoffDate={setCutoffDate}
          presets={presets}
          onSelectPreset={handleSelectPreset}
          onSubmit={handlePredict}
          loading={loading}
        />

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
    </div>
  );
}
