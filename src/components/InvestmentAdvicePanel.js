import React from 'react';

/**
 * Investment Advisory Panel Component
 * Displays actionable buy/sell/hold ratings, capital weights, and safety warnings.
 * 
 * Why this layout is curated:
 * - High readability: Uses visual badges with high contrast colors (emerald for Buy, 
 *   rose for Sell, amber for Hold) so users absorb decisions instantly.
 * - Risk prioritization: Puts capital risk mitigation details at the bottom with warning flags,
 *   prompting defensive investment habits.
 */
export default function InvestmentAdvicePanel({ advice = {} }) {
  const { portfolio, buySell, risk } = advice;

  if (!portfolio && !buySell && !risk) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        暫無投資建議報告數據。
      </div>
    );
  }

  // Styles configuration based on advice actions.
  const actionStyles = {
    Buy: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
    Sell: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50',
    Hold: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50'
  };

  const riskStyles = {
    Low: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/10',
    Medium: 'text-amber-500 bg-amber-50 dark:bg-amber-950/10',
    High: 'text-orange-500 bg-orange-50 dark:bg-orange-950/10',
    Critical: 'text-red-600 bg-red-50 dark:bg-red-950/10 animate-pulse'
  };

  const currentAction = buySell?.action || 'Hold';
  const currentRisk = risk?.riskLevel || 'Medium';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          AI 智能投資決策報告
        </h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${riskStyles[currentRisk]}`}>
          {`${currentRisk} RISK`.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Buy/Sell/Hold Rating Card */}
        <div className={`border rounded-xl p-4 flex flex-col justify-between ${actionStyles[currentAction]}`}>
          <div>
            <div className="text-xs opacity-75 uppercase tracking-wider mb-1">評級策略 (Rating)</div>
            <div className="text-3xl font-extrabold tracking-tight">{currentAction}</div>
          </div>
          <div className="text-xs mt-3 opacity-90 leading-relaxed">
            {buySell?.summary || '評估完成，維持當前策略。'}
          </div>
        </div>

        {/* Portfolio Target Weight Card */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">配置權重 (Weight)</div>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {portfolio?.targetWeight !== undefined ? `${(portfolio.targetWeight * 100).toFixed(0)}%` : '0%'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
              級別: {portfolio?.allocationClass || 'N/A'}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-3">
            {portfolio?.rationale}
          </p>
        </div>

        {/* Confidence Score Gauge */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">評估置信度 (Confidence)</div>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {buySell?.confidenceScore !== undefined ? `${(buySell.confidenceScore * 100).toFixed(0)}%` : '50%'}
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${(buySell?.confidenceScore || 0.5) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">演算法多因子置信區間模型</span>
          </div>
        </div>
      </div>

      {/* Risk Mitigation Section */}
      {risk && (
        <div className="bg-rose-50/20 dark:bg-rose-950/5 border border-rose-100/50 dark:border-rose-900/30 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            ⚠️ 風險管理防守指引 (Risk Management)
          </h4>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block mb-1">偵測到的曝險因子:</span>
              <div className="flex flex-wrap gap-1.5">
                {risk.riskFactors?.map((factor, idx) => (
                  <span 
                    key={idx} 
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300 font-medium"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block mb-0.5">停損與風控策略:</span>
              <p className="text-xs text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                {risk.riskMitigation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
