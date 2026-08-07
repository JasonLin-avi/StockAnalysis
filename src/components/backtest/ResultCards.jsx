'use client';

/**
 * ResultCards Component
 * 
 * Displays dual panel comparison cards:
 * 1. Predictor LLM Forecast Report: Generated strictly from point-in-time past data to prevent lookahead bias.
 * 2. Evaluator & Future Outcome Card: Displays actual performance after revealing future data and shows judge LLM evaluation scores.
 */

import React from 'react';

export default function ResultCards({ forecast, evaluation, onReveal, evaluating }) {
  if (!forecast) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Left Card: Predictor LLM Output */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>🤖</span> LLM 歷史時點分析報告
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                forecast.trend === 'BULLISH'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : forecast.trend === 'BEARISH'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {forecast.trend === 'BULLISH'
                ? '🟢 多頭看漲'
                : forecast.trend === 'BEARISH'
                ? '🔴 空頭看跌'
                : '🟡 盤整觀望'}
            </span>
          </div>

          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">預測目標價區間:</span>
              <span className="font-semibold text-cyan-300">
                ${forecast.targetPriceRange ? forecast.targetPriceRange.join(' - $') : 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">建議停損價:</span>
                <span className="font-semibold text-rose-400">${forecast.stopLossPrice || 'N/A'}</span>
              </div>
              <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">預測信心度:</span>
                <span className="font-semibold text-amber-400">{forecast.confidence || 8} / 10</span>
              </div>
            </div>

            {(forecast.keySupport || forecast.keyResistance) && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block">關鍵支撐:</span>
                  <span className="font-medium text-slate-200">${forecast.keySupport || 'N/A'}</span>
                </div>
                <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block">關鍵壓力:</span>
                  <span className="font-medium text-slate-200">${forecast.keyResistance || 'N/A'}</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-700/60">
              <span className="text-slate-400 block mb-1 text-xs font-medium">推理細節 (Rationale):</span>
              <p className="bg-slate-900/60 p-3 rounded-lg text-slate-300 text-xs leading-relaxed border border-slate-800">
                {forecast.rationale}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Card: Future Outcome & Evaluator Assessment */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🎯</span> 實際走勢與預測比對
          </h3>

          {!evaluation ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-xl">
                🔒
              </div>
              <p className="text-slate-300 font-medium text-sm mb-1">LLM 點位預測已完成！</p>
              <p className="text-slate-400 text-xs mb-6 max-w-xs mx-auto leading-relaxed">
                點擊下方按鈕揭曉歷史基準日之後的實際未來走勢，並由裁判 LLM 進行精準度覆盤評分。
              </p>
              <button
                onClick={onReveal}
                disabled={evaluating}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm shadow-md hover:shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {evaluating ? '揭曉與評估中...' : '🔓 揭曉未來走勢與自動對比評分'}
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400 text-xs block">AI 技術分析精準度評分</span>
                  <span className="text-xs font-semibold text-slate-300">
                    {evaluation.directionCorrect ? '方向符合 ✅' : '方向偏差 ❌'}
                  </span>
                </div>
                <span className="text-3xl font-extrabold text-cyan-400">
                  {evaluation.accuracyScore} <span className="text-sm font-normal text-slate-500">/ 100</span>
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400">實際未來期間漲跌幅:</span>
                <span
                  className={`font-bold text-sm ${
                    evaluation.actualReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {evaluation.actualReturnPct >= 0 ? `+${evaluation.actualReturnPct}%` : `${evaluation.actualReturnPct}%`}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-700/60">
                <span className="text-slate-400 block mb-1 text-xs font-medium">裁判 LLM 覆盤檢討:</span>
                <p className="bg-slate-900/60 p-3 rounded-lg text-slate-300 text-xs leading-relaxed border border-slate-800">
                  {evaluation.evaluationSummary}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
