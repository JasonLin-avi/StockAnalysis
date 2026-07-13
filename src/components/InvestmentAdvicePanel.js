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
      {activeModal && <AdvisoryModal type={activeModal} onClose={() => setActiveModal(null)} />}
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
function AdvisoryModal({ type, onClose }) {
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
        // Why role="dialog", aria-modal="true", and aria-labelledby are placed on this inner container rather than the backdrop:
        // - semantic correctness: It ensures assistive technologies (like screen readers) correctly associate the dialog properties with the actual modal content container rather than the full-screen overlay, preventing misidentification of the dialog boundary.
        // - accessibility: Moving these attributes here and linking them to "modal-title" helps visually impaired users accurately locate the dialog text.
        // - stop propagation: We stop click event propagation here so that clicking inside the modal container does not bubble up 
        // to the backdrop's click-to-close handler. This prevents the modal from accidentally closing when users 
        // interact with or select text within the dialog itself.
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

        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl p-3.5 mb-4 text-xs font-mono text-sky-600 dark:text-sky-400 break-words leading-relaxed">
          {content.formula}
        </div>

        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 leading-relaxed overflow-y-auto">
          {content.details.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
