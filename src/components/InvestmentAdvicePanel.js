"use client";

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
  // We track the active modal type using a React state to control which details (rating, weight, confidence) 
  // are currently shown to the user. Setting it to null indicates that no modal should be visible.
  const [activeModal, setActiveModal] = React.useState(null);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Users expect modal dialogs to be closable via the keyboard for better accessibility and convenience.
      // Intercepting 'Escape' allows quick dismiss without requiring precise mouse clicks on the close button.
      if (e.key === 'Escape') setActiveModal(null);
    };

    // Event listener is only attached when a modal is active to optimize performance and prevent unnecessary CPU cycles.
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
      // Disable background body scrolling when the modal is open.
      // This prevents the underlying page content from moving or scrolling when the user scrolls within the modal container.
      document.body.style.overflow = 'hidden';
    }

    // We must remove the keydown listener and restore the body scroll style on cleanup.
    // Restoring the overflow style to empty string is critical to prevent the page from being permanently locked 
    // in a non-scrollable state after the modal is closed or the component is unmounted.
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeModal]);

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
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs opacity-75 uppercase tracking-wider">評級策略 (Rating)</div>
              <button
                type="button"
                onClick={() => setActiveModal('rating')}
                className="opacity-75 hover:opacity-100 focus:outline-none transition-opacity ml-1 flex items-center justify-center"
                aria-label="查看評級策略公式與說明"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </button>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">{currentAction}</div>
          </div>
          <div className="text-xs mt-3 opacity-90 leading-relaxed">
            {buySell?.summary || '評估完成，維持當前策略。'}
          </div>
        </div>

        {/* Portfolio Target Weight Card */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider">配置權重 (Weight)</div>
              <button
                type="button"
                onClick={() => setActiveModal('weight')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors ml-1 flex items-center justify-center"
                aria-label="查看配置權重公式與說明"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </button>
            </div>
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
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider">評估置信度 (Confidence)</div>
              <button
                type="button"
                onClick={() => setActiveModal('confidence')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors ml-1 flex items-center justify-center"
                aria-label="查看評估置信度公式與說明"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </button>
            </div>
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
      {activeModal && <AdvisoryModal type={activeModal} advice={advice} onClose={() => setActiveModal(null)} />}
    </div>
  );
}

/**
 * AdvisoryModal Sub-component
 * 
 * Why this sub-component is defined:
 * - Decoupling: Separating the presentation logic of detailed explanations keeps the main panel logic clean and maintainable.
 * - Reusability: Formats rating, weight, and confidence metrics uniformly based on a shared template and structural properties.
 */
function AdvisoryModal({ type, advice = {}, onClose }) {
  // Mapping table for common financial indicators status text from raw english states to friendly dual-language display.
  // Why this is useful: Translating raw state metrics in-place improves terminal user understanding and complies with local preference.
  const statusMapping = {
    'Oversold': 'Oversold (超賣)',
    'Overbought': 'Overbought (超買)',
    'Bullish': 'Bullish (看漲)',
    'Bearish': 'Bearish (看跌)',
    'Fair': 'Fair (合理)',
    'Strong': 'Strong (強勁)',
    'Healthy': 'Healthy (健康)',
    'High Growth': 'High Growth (高成長)',
    'Weak': 'Weak (偏弱)',
    'Undervalued': 'Undervalued (低估)',
    'Overvalued': 'Overvalued (高估)'
  };

  const getStatusText = (status) => statusMapping[status] || status || 'N/A';

  const getBadgeColor = (score) => {
    // Why dynamic badge colors: Matching visual color weight (emerald for strong 2pts, amber for moderate 1pt, slate for weak 0pt)
    // prevents cognitive misleading when users look at medium-health or high-leverage indicators.
    if (score === 2) {
      return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
    }
    if (score === 1) {
      return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
    }
    return 'bg-slate-50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/40';
  };

  const contentMap = {
    rating: {
      title: '評級策略 (Rating) 指標說明',
      formula: '總分 (100) = 基本面評分 (50) + 技術面評分 (30) + 情緒評分 (20)',
      details: [
        '基本面 (50分): 依據 PE 估值、EPS 增長、負債比、營收成長與現金流進行判定。',
        '技術面 (30分): 依據 RSI 動能、MA 趨勢與 MACD 柱狀體判定。',
        '情緒面 (20分): 轉換新聞輿情與社群熱度指數計分。',
        '總分 >= 70 為 Buy，<= 40 為 Sell，介於兩者之間為 Hold。'
      ]
    },
    weight: {
      title: '配置權重 (Weight) 指標說明',
      formula: '配置權重 = 財務健康評估 (Health Score) + 市場情緒修飾 (Sentiment Modifier)',
      details: [
        '單一股票配置上限為 15%，避免過度集中風險。',
        'Avoid (0%): 負債比率為 High Risk 時觸發（一票否決制）。',
        'Overweight (12%): 財務極佳（Health Score >= 8）且市場看好時配置。',
        'Equal Weight (5% - 8%): 財務與情緒穩定，作為防禦型核心持股。',
        'Underweight (2%): 基本面偏弱或情緒冰冷，調降權重防範下行。'
      ]
    },
    confidence: {
      title: '評估置信度 (Confidence) 指標說明',
      formula: '置信度反映 AI 對評級決策的信心程度（區間 50% ~ 95%）',
      details: [
        '當評級為 Buy 時: 置信度 = 70% + ((總分 - 70) / 30) * 25%',
        '當評級為 Sell 時: 置信度 = 70% + ((40 - 總分) / 40) * 25%',
        '當評級為 Hold 時: 置信度 = 50% + ((總分 - 40) / 30) * 20%',
        '因子方向越共振（接近 0 或 100 分），置信度越高；評分接近中性時，置信度則會降至 50% 附近。'
      ]
    }
  };

  const content = contentMap[type];
  if (!content) return null;

  const { portfolio = {}, buySell = {} } = advice;

  // Render specific content helper
  // Why this function is split: Keeping modal rendering clean by isolating complex table structures from container styling.
  const renderModalBody = () => {
    if (type === 'rating' && buySell.breakdown) {
      const breakdown = buySell.breakdown;
      const totalScore = buySell.totalScore || 0;
      
      return (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="py-2 font-semibold">分析維度 / 指標</th>
                  <th className="py-2 font-semibold text-right">當前數值</th>
                  <th className="py-2 font-semibold text-center">狀態評級</th>
                  <th className="py-2 font-semibold text-right">得分 / 滿分</th>
                </tr>
              </thead>
              <tbody>
                {/* 技術面細項 (Technical) */}
                {breakdown.technical && (
                  <>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                      <td className="py-2 px-2" colSpan="3">技術面分析 (Technical)</td>
                      <td className="py-2 px-2 text-right">{breakdown.technical.score} / 30</td>
                    </tr>
                    {breakdown.technical.rsi && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">RSI 強弱指標</td>
                        {/* Why tabular-nums: Aligning numbers vertically in tables ensures financial metrics and scores remain legible and easily comparable across rows, mitigating reading alignment cognitive load. */}
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.technical.rsi.value}</td>
                        <td className="py-2 text-center text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                            {getStatusText(breakdown.technical.rsi.status)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.technical.rsi.score} / 10</td>
                      </tr>
                    )}
                    {breakdown.technical.ma && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">移動平均線 MA</td>
                        <td className="py-2 text-right font-mono tabular-nums">
                          {breakdown.technical.ma.value} {breakdown.technical.ma.ma !== undefined && `(MA: ${breakdown.technical.ma.ma})`}
                        </td>
                        <td className="py-2 text-center text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                            {getStatusText(breakdown.technical.ma.status)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.technical.ma.score} / 10</td>
                      </tr>
                    )}
                    {breakdown.technical.macd && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">MACD 柱狀體</td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.technical.macd.value}</td>
                        <td className="py-2 text-center text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                            {getStatusText(breakdown.technical.macd.status)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.technical.macd.score} / 10</td>
                      </tr>
                    )}
                  </>
                )}
                
                {/* 基本面細項 (Fundamental) */}
                {breakdown.fundamental && (
                  <>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                      <td className="py-2 px-2" colSpan="3">基本面財務分析 (Fundamental)</td>
                      <td className="py-2 px-2 text-right">{breakdown.fundamental.score} / 50</td>
                    </tr>
                    {breakdown.fundamental.pe && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">市盈率 P/E 估值</td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.fundamental.pe.value}x</td>
                        <td className="py-2 text-center text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                            {getStatusText(breakdown.fundamental.pe.status)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.fundamental.pe.score} / 10</td>
                      </tr>
                    )}
                    {breakdown.fundamental.eps && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">每股收益 EPS</td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.fundamental.eps.value}</td>
                        <td className="py-2 text-center text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                            {getStatusText(breakdown.fundamental.eps.status)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.fundamental.eps.score} / 10</td>
                      </tr>
                    )}
                    {breakdown.fundamental.debtRatio && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">負債比率 Debt Ratio</td>
                        <td className="py-2 text-right font-mono tabular-nums">
                          {breakdown.fundamental.debtRatio.value !== undefined ? `${(breakdown.fundamental.debtRatio.value * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="py-2 text-center text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                            {getStatusText(breakdown.fundamental.debtRatio.status)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.fundamental.debtRatio.score} / 10</td>
                      </tr>
                    )}
                    {breakdown.fundamental.revenueGrowth && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">營收年成長率 Growth</td>
                        <td className="py-2 text-right font-mono tabular-nums">
                          {breakdown.fundamental.revenueGrowth.value !== undefined ? `${(breakdown.fundamental.revenueGrowth.value * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="py-2 text-center text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                            {getStatusText(breakdown.fundamental.revenueGrowth.status)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.fundamental.revenueGrowth.score} / 10</td>
                      </tr>
                    )}
                    {breakdown.fundamental.cashFlow && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">自由現金流 Cash Flow</td>
                        <td className="py-2 text-right font-mono tabular-nums">
                          {breakdown.fundamental.cashFlow.value !== undefined ? breakdown.fundamental.cashFlow.value.toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 text-center text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                            {getStatusText(breakdown.fundamental.cashFlow.status)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.fundamental.cashFlow.score} / 10</td>
                      </tr>
                    )}
                  </>
                )}
                
                {/* 情緖面細項 (Sentiment) */}
                {breakdown.sentiment && (
                  <>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                      <td className="py-2 px-2" colSpan="3">市場情緒指標 (Sentiment)</td>
                      <td className="py-2 px-2 text-right">{breakdown.sentiment.score} / 20</td>
                    </tr>
                    {breakdown.sentiment.news && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">新聞輿情評分</td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.sentiment.news.value}</td>
                        <td className="py-2 text-center text-[10px]">-</td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.sentiment.news.score} / 10</td>
                      </tr>
                    )}
                    {breakdown.sentiment.social && (
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-2 pl-4">社群熱度評分</td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.sentiment.social.value}</td>
                        <td className="py-2 text-center text-[10px]">-</td>
                        <td className="py-2 text-right font-mono tabular-nums">{breakdown.sentiment.social.score} / 10</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">當前決策總評分:</span>
            {/* Why inline text container: Keeping the full string inside one text node ensures simple RTL (React Testing Library) text assertions can match perfectly. */}
            <span className="font-extrabold text-sm text-sky-600 dark:text-sky-400 tabular-nums">
              {totalScore} / 100
            </span>
          </div>
        </div>
      );
    }

    if (type === 'weight' && portfolio.breakdown) {
      const pBreakdown = portfolio.breakdown;
      return (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="py-2 font-semibold">財務健康因子 (Financial Factor)</th>
                  <th className="py-2 font-semibold text-center">狀態評級</th>
                  <th className="py-2 font-semibold text-right">得分 (0-2分)</th>
                </tr>
              </thead>
              <tbody>
                {pBreakdown.debtRatio && (
                  <tr className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2">負債比率 (Debt Ratio)</td>
                    <td className="py-2 text-center text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded border ${getBadgeColor(pBreakdown.debtRatio.score)}`}>
                        {getStatusText(pBreakdown.debtRatio.status)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{pBreakdown.debtRatio.score}</td>
                  </tr>
                )}
                {pBreakdown.eps && (
                  <tr className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2">每股收益 (EPS)</td>
                    <td className="py-2 text-center text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded border ${getBadgeColor(pBreakdown.eps.score)}`}>
                        {getStatusText(pBreakdown.eps.status)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{pBreakdown.eps.score}</td>
                  </tr>
                )}
                {pBreakdown.revenueGrowth && (
                  <tr className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2">營收成長 (Revenue Growth)</td>
                    <td className="py-2 text-center text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded border ${getBadgeColor(pBreakdown.revenueGrowth.score)}`}>
                        {getStatusText(pBreakdown.revenueGrowth.status)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{pBreakdown.revenueGrowth.score}</td>
                  </tr>
                )}
                {pBreakdown.cashFlow && (
                  <tr className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2">自由現金流 (Cash Flow)</td>
                    <td className="py-2 text-center text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded border ${getBadgeColor(pBreakdown.cashFlow.score)}`}>
                        {getStatusText(pBreakdown.cashFlow.status)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{pBreakdown.cashFlow.score}</td>
                  </tr>
                )}
                {pBreakdown.pe && (
                  <tr className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2">市盈率估值 (P/E)</td>
                    <td className="py-2 text-center text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded border ${getBadgeColor(pBreakdown.pe.score)}`}>
                        {getStatusText(pBreakdown.pe.status)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{pBreakdown.pe.score}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-400">財務健康總分 (Health Score):</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{portfolio.healthScore !== undefined ? `${portfolio.healthScore} / 10` : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-400">情緒修飾值 (Sentiment Score):</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{portfolio.sentimentScore !== undefined ? portfolio.sentimentScore : 'N/A'}</span>
            </div>
            <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2 mt-2">
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">最終匹配配置原因:</span>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {portfolio.rationale || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'confidence' && buySell.totalScore !== undefined) {
      const totalScore = buySell.totalScore;
      const action = buySell.action || 'Hold';
      
      let formulaText = '';
      let steps = [];
      let finalPercent = '';

      if (action === 'Buy') {
        formulaText = '置信度 = 70% + ((總分 - 70) / 30) * 25%';
        const diff = totalScore - 70;
        const multiplier = diff / 30;
        const incremental = multiplier * 25;
        const finalVal = 70 + incremental;
        steps = [
          `置信度 = 70% + ((${totalScore} - 70) / 30) * 25%`,
          `置信度 = 70% + ((${diff}) / 30) * 25%`,
          `置信度 = 70% + (${multiplier.toFixed(4)} * 25%)`,
          `置信度 = 70% + ${incremental.toFixed(2)}%`,
          `置信度 = ${finalVal.toFixed(2)}%`
        ];
        finalPercent = `${finalVal.toFixed(2)}%`;
      } else if (action === 'Sell') {
        formulaText = '置信度 = 70% + ((40 - 總分) / 40) * 25%';
        const diff = 40 - totalScore;
        const multiplier = diff / 40;
        const incremental = multiplier * 25;
        const finalVal = 70 + incremental;
        steps = [
          `置信度 = 70% + ((40 - ${totalScore}) / 40) * 25%`,
          `置信度 = 70% + ((${diff}) / 40) * 25%`,
          `置信度 = 70% + (${multiplier.toFixed(4)} * 25%)`,
          `置信度 = 70% + ${incremental.toFixed(2)}%`,
          `置信度 = ${finalVal.toFixed(2)}%`
        ];
        finalPercent = `${finalVal.toFixed(2)}%`;
      } else {
        formulaText = '置信度 = 50% + ((總分 - 40) / 30) * 20%';
        const diff = totalScore - 40;
        const multiplier = diff / 30;
        const incremental = multiplier * 20;
        const finalVal = 50 + incremental;
        steps = [
          `置信度 = 50% + ((${totalScore} - 40) / 30) * 20%`,
          `置信度 = 50% + ((${diff}) / 30) * 20%`,
          `置信度 = 50% + (${multiplier.toFixed(4)} * 20%)`,
          `置信度 = 50% + ${incremental.toFixed(2)}%`,
          `置信度 = ${finalVal.toFixed(2)}%`
        ];
        finalPercent = `${finalVal.toFixed(2)}%`;
      }

      return (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl p-3.5 font-mono text-xs text-sky-600 dark:text-sky-400 space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5 mb-2 flex justify-between">
              <span>當前置信度推導過程:</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold">{action}</span>
            </div>
            <div>代入參數：總分 = {totalScore}</div>
            <div>套用公式：{formulaText}</div>
            <div className="border-t border-slate-200/20 dark:border-slate-800/20 pt-2 mt-2 space-y-1">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-slate-400">步驟 {idx + 1}:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{step}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200/40 dark:border-slate-800/40 pt-2 mt-2 flex justify-between font-bold text-slate-800 dark:text-slate-200">
              <span>最終計算置信度:</span>
              <span>{finalPercent}</span>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 leading-relaxed overflow-y-auto">
            {content.details.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      );
    }

    // Default Fallback
    // Why standard fallback is needed: Ensures backward compatibility and handles cases where raw metrics breakdown is empty.
    return (
      <>
        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl p-3.5 mb-4 text-xs font-mono text-sky-600 dark:text-sky-400 break-words leading-relaxed">
          {content.formula}
        </div>

        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 leading-relaxed overflow-y-auto">
          {content.details.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <div 
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 relative animate-scale-up"
        // Why role="dialog", aria-modal="true", and aria-labelledby are placed on this inner container:
        // - Semantic correctness: Screen readers associate dialog boundaries and headers properly instead of incorrectly binding to the overlay backdrop.
        // - Stop click propagation: Prevents mouse click bubbling from closing the modal when interacting with data rows or copying text inside the container.
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all duration-300 hover:rotate-90 focus:outline-none"
          aria-label="關閉說明彈窗"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h4 id="modal-title" className="text-base font-bold text-slate-800 dark:text-slate-100 pr-8 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          {content.title}
        </h4>

        {renderModalBody()}
      </div>
    </div>
  );
}
