'use client';

/**
 * ResultCards Component
 * 
 * Displays dual panel comparison cards:
 * 1. Predictor LLM Forecast Report: Generated strictly from point-in-time past data to prevent lookahead bias.
 * 2. Evaluator & Future Outcome Card: Displays actual performance after revealing future data and shows judge LLM evaluation scores.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ResultCards({ forecast, evaluation, onReveal, evaluating }) {
  if (!forecast) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Left Card: Predictor LLM Output */}
      <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between transition-all duration-300">
        <div>
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800/80">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M216,40H40A16,16,0,0,0,24,56V184a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,144H40V56H216V184ZM80,96A16,16,0,1,1,96,112,16,16,0,0,1,80,96Zm96,0a16,16,0,1,1,16,112A16,16,0,0,1,176,96Zm-88,56a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,152Z" />
                </svg>
              </div>
              <span>LLM 歷史時點分析報告</span>
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-colors ${
                forecast.trend === 'BULLISH'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : forecast.trend === 'BEARISH'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {forecast.trend === 'BULLISH'
                ? '🟢 多頭看漲'
                : forecast.trend === 'BEARISH'
                ? '🔴 空頭看跌'
                : '🟡 盤整觀望'}
            </span>
          </div>

          <div className="space-y-3.5 text-sm text-slate-300">
            <div className="flex justify-between items-center bg-slate-950/60 px-3.5 py-3 rounded-xl border border-slate-800/80 shadow-inner">
              <span className="text-slate-400 text-xs font-medium">預測目標價區間:</span>
              <span className="font-bold text-sm text-cyan-300 tracking-wide font-mono">
                ${forecast.targetPriceRange ? forecast.targetPriceRange.join(' - $') : 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1 font-medium">建議停損價:</span>
                <span className="font-bold text-sm text-rose-400 font-mono">${forecast.stopLossPrice || 'N/A'}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1 font-medium">預測信心度:</span>
                <span className="font-bold text-sm text-amber-400 font-mono">{forecast.confidence || 8} / 10</span>
              </div>
            </div>

            {(forecast.keySupport || forecast.keyResistance) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block mb-1 font-medium">關鍵支撐:</span>
                  <span className="font-semibold text-slate-200 font-mono">${forecast.keySupport || 'N/A'}</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block mb-1 font-medium">關鍵壓力:</span>
                  <span className="font-semibold text-slate-200 font-mono">${forecast.keyResistance || 'N/A'}</span>
                </div>
              </div>
            )}

            <div className="pt-3.5 border-t border-slate-800/80">
              <span className="text-slate-400 block mb-2.5 text-xs font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-cyan-400" viewBox="0 0 256 256">
                  <path d="M224,200H32V40A8,8,0,0,0,16,40V208a8,8,0,0,0,8,8H224a8,8,0,0,0,0-16ZM64,168a8,8,0,0,1-5.66-13.66l40-40a8,8,0,0,1,11.32,0l24.34,24.34,48-48A8,8,0,0,1,193.66,102l-53.66,53.66a8,8,0,0,1-11.32,0L104,131.31l-34.34,34.35A8,8,0,0,1,64,168Z" />
                </svg>
                15年資深量化專家推理細節 (Rationale):
              </span>
              <div className="bg-slate-950/80 p-4 rounded-xl text-slate-200 text-xs leading-relaxed border border-slate-800/80 shadow-inner prose prose-invert prose-xs max-w-none prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-cyan-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {forecast.rationale}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Card: Future Outcome & Evaluator Assessment */}
      <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between transition-all duration-300">
        <div>
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800/80">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-144a56,56,0,1,0,56,56A56.06,56.06,0,0,0,128,72Zm0,96a40,40,0,1,1,40-40A40.05,40.05,0,0,1,128,168Z" />
                </svg>
              </div>
              <span>實際走勢與預測比對</span>
            </h3>
            {evaluation && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                對比完成
              </span>
            )}
          </div>

          {!evaluation ? (
            <div className="text-center py-10 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z" />
                </svg>
              </div>
              <p className="text-slate-200 font-bold text-base mb-1.5">LLM 點位預測已完成！</p>
              <p className="text-slate-400 text-xs mb-6 max-w-xs mx-auto leading-relaxed">
                點擊下方按鈕揭曉歷史基準日之後的實際未來走勢，並由裁判 LLM 進行精準度覆盤評分。
              </p>
              <button
                onClick={onReveal}
                disabled={evaluating}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                {evaluating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>揭曉與評估中...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M208,80H96V56a32,32,0,0,1,64,0,8,8,0,0,0,16,0,48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM48,96H208V208H48Z" />
                    </svg>
                    <span>🔓 揭曉未來走勢與自動對比評分</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 shadow-inner">
                <div>
                  <span className="text-slate-400 text-xs block mb-1 font-medium">AI 技術分析精準度評分</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md inline-block ${
                    evaluation.directionCorrect
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    {evaluation.directionCorrect ? '方向符合 ✅' : '方向偏差 ❌'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-cyan-400 font-mono tracking-tight">
                    {evaluation.accuracyScore}
                  </span>
                  <span className="text-xs font-normal text-slate-500 ml-1">/ 100</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                <span className="text-slate-400 font-medium">實際未來期間漲跌幅:</span>
                <span
                  className={`font-bold text-sm font-mono ${
                    evaluation.actualReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {evaluation.actualReturnPct >= 0 ? `+${evaluation.actualReturnPct}%` : `${evaluation.actualReturnPct}%`}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-slate-400 block mb-2 text-xs font-semibold flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-cyan-400" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,32a12,12,0,1,1,12-12A12,12,0,0,1,128,168Z" />
                  </svg>
                  裁判 LLM 覆盤檢討:
                </span>
                <p className="bg-slate-950/80 p-3.5 rounded-xl text-slate-200 text-xs leading-relaxed border border-slate-800/80 shadow-inner">
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
