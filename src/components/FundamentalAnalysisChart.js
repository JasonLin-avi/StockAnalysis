"use client";

import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import ChartContainer from './ChartContainer';

/**
 * Fundamental Analysis Radar Component
 * Renders a radar (spider) chart to visualize financial health across five dimensions.
 * 
 * Why a Radar chart is chosen:
 * - A radar chart normalizes different metrics (P/E ratio, debt, revenue growth) into a unified 
 *   score (0 to 100), allowing investors to evaluate stock quality at a single glance.
 * - This provides the signature "spider chart" aesthetic commonly used in professional investment platforms.
 */
export default function FundamentalAnalysisChart({ fundamentalData = {}, symbol = 'Stock' }) {
  const { pe, eps, debtRatio, revenueGrowth, cashFlow } = fundamentalData;

  // If no data, render empty state.
  if (!pe && !eps && !debtRatio && !revenueGrowth && !cashFlow) {
    return (
      <ChartContainer title={`${symbol} 基本面評分`} subtitle="無基本面數據">
        <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
          未提供充足數據進行基本面分析
        </div>
      </ChartContainer>
    );
  }

  // Format cash numbers to human readable (e.g. 15.60B)
  const formatCashFlow = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    const absVal = Math.abs(value);
    if (absVal >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (absVal >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (absVal >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    return value.toLocaleString();
  };

  // Calculate Cash Flow conversion ratio (FCF / OCF)
  const getCashFlowRatio = (cf) => {
    if (!cf || !cf.operatingCashFlow) return null;
    return cf.freeCashFlow / cf.operatingCashFlow;
  };
  const cfRatio = getCashFlowRatio(cashFlow);

  // Helper to map status to 0 - 100 score for radar visualization.
  const getPEScore = (status) => {
    if (status === 'Undervalued') return 100;
    if (status === 'Fair') return 75;
    if (status === 'Overvalued') return 35;
    return 15; // Loss / N/A
  };

  const getGeneralScore = (status) => {
    if (status === 'Strong' || status === 'Healthy' || status === 'High Growth') return 100;
    if (status === 'Moderate' || status === 'Stable Growth') return 70;
    if (status === 'Weak' || status === 'Declining' || status === 'High Risk') return 25;
    return 15;
  };

  const radarData = [
    { subject: '估值 (P/E)', A: getPEScore(pe?.status) },
    { subject: '盈利能力 (EPS)', A: getGeneralScore(eps?.status) },
    { subject: '償債能力 (Debt)', A: getGeneralScore(debtRatio?.status) },
    { subject: '擴張速度 (Growth)', A: getGeneralScore(revenueGrowth?.status) },
    { subject: '盈餘品質 (Cash Flow)', A: getGeneralScore(cashFlow?.status) }
  ];

  return (
    <ChartContainer 
      title={`${symbol} 財務健康雷達圖`} 
      subtitle="綜合財務指標歸一化百分制評估（數值越高代表健康度越健全，例如低 P/E 或低負債會得到更高分）"
    >
      <div className="flex flex-col gap-6">
        <div className="w-full flex flex-col md:flex-row items-center justify-around gap-4">
          {/* Radar Chart Visual */}
          <div className="h-64 w-full md:w-1/2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="rgba(148, 163, 184, 0.3)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(100, 116, 139, 0.85)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={symbol}
                  dataKey="A"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.15}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Metrics Panel */}
          <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-500 dark:text-slate-400 mb-0.5 font-medium">市盈率 P/E</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {pe?.value !== null ? `${pe?.value}x` : 'N/A'}
              </div>
              <div className={`text-[10px] mt-1 font-semibold ${
                pe?.status === 'Undervalued' ? 'text-emerald-600 dark:text-emerald-400' :
                pe?.status === 'Fair' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {pe?.status}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-500 dark:text-slate-400 mb-0.5 font-medium">每股收益 EPS</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {eps?.value !== null ? `${eps?.value}` : 'N/A'}
              </div>
              <div className={`text-[10px] mt-1 font-semibold ${
                eps?.status === 'Strong' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {eps?.trend !== 'N/A' ? `${eps?.trend} (${eps?.status})` : eps?.status}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-500 dark:text-slate-400 mb-0.5 font-medium">負債比率 Debt</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {debtRatio?.value !== null ? `${(debtRatio?.value * 100).toFixed(2)}%` : 'N/A'}
              </div>
              <div className={`text-[10px] mt-1 font-semibold ${
                debtRatio?.status === 'Healthy' ? 'text-emerald-600 dark:text-emerald-400' :
                debtRatio?.status === 'Moderate' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {debtRatio?.status}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-500 dark:text-slate-400 mb-0.5 font-medium">營收成長 Revenue</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {revenueGrowth?.value !== null ? `${(revenueGrowth?.value * 100).toFixed(2)}%` : 'N/A'}
              </div>
              <div className={`text-[10px] mt-1 font-semibold ${
                revenueGrowth?.status === 'High Growth' ? 'text-emerald-600 dark:text-emerald-400' :
                revenueGrowth?.status === 'Stable Growth' ? 'text-slate-500 dark:text-slate-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {revenueGrowth?.status}
              </div>
            </div>

            <div className="col-span-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-500 dark:text-slate-400 mb-0.5 font-medium">盈餘品質 Cash Flow (自由現金流佔比)</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {cfRatio !== null ? `${(cfRatio * 100).toFixed(2)}%` : 'N/A'}
              </div>
              <div className="flex justify-between items-center mt-1">
                <div className={`text-[10px] font-semibold ${
                  cashFlow?.status === 'Healthy' || cashFlow?.status === 'Strong' ? 'text-emerald-600 dark:text-emerald-400' :
                  cashFlow?.status === 'Moderate' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {cashFlow?.status}
                </div>
                <div className="text-[9px] text-slate-400 dark:text-slate-500">
                  OCF: {formatCashFlow(cashFlow?.operatingCashFlow)} | FCF: {formatCashFlow(cashFlow?.freeCashFlow)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Assessment Explanations */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 text-[11px] leading-relaxed">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3.5 flex items-center gap-1.5">
            📋 財務健康指標評估說明
          </h4>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <div className="sm:w-1/4 font-semibold text-slate-800 dark:text-slate-300">市盈率 P/E (估值)</div>
              <div className="sm:w-3/4 text-slate-600 dark:text-slate-400">
                評估當前股價相較於盈餘的溢價程度。當前評為 <span className="text-slate-900 dark:text-slate-200 font-medium">{pe?.status || 'N/A'}</span> ({pe?.value !== null ? `${pe?.value}x` : 'N/A'})。
                基準為：小於 15x 為低估值，15~30x 為合理估值，大於 30x 為高溢價/高估。
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <div className="sm:w-1/4 font-semibold text-slate-800 dark:text-slate-300">每股收益 EPS (盈利能力)</div>
              <div className="sm:w-3/4 text-slate-600 dark:text-slate-400">
                公司經營獲取淨利的能力。當前評為 <span className="text-slate-900 dark:text-slate-200 font-medium">{eps?.status || 'N/A'}</span> (趨勢為 {eps?.trend || 'N/A'}，當前為 {eps?.value ?? 'N/A'})。
                正值且連年增長代表企業經營前景強勁，具有長期競爭優勢（護城河）。
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <div className="sm:w-1/4 font-semibold text-slate-800 dark:text-slate-300">負債比率 Debt (償債能力)</div>
              <div className="sm:w-3/4 text-slate-600 dark:text-slate-400">
                衡量公司的債務槓桿與財務安全性。當前評為 <span className="text-slate-900 dark:text-slate-200 font-medium">{debtRatio?.status || 'N/A'}</span> ({debtRatio?.value !== null ? `${(debtRatio?.value * 100).toFixed(2)}%` : 'N/A'})。
                小於 50% 為債務健康，50%~80% 屬合理負債，大於 80% 代表財務高槓桿、面臨高利息與財務重組風險。
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <div className="sm:w-1/4 font-semibold text-slate-800 dark:text-slate-300">營收成長 Revenue (擴張速度)</div>
              <div className="sm:w-3/4 text-slate-600 dark:text-slate-400">
                反映公司市場佔有率與銷售額擴張速率。當前評為 <span className="text-slate-900 dark:text-slate-200 font-medium">{revenueGrowth?.status || 'N/A'}</span> ({revenueGrowth?.value !== null ? `${(revenueGrowth?.value * 100).toFixed(2)}%` : 'N/A'})。
                成長率大於 15% 屬高擴張，0%~15% 為穩定擴張，低於 0% 代表業務出現萎縮。
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <div className="sm:w-1/4 font-semibold text-slate-800 dark:text-slate-300">盈餘品質 Cash Flow (盈餘品質)</div>
              <div className="sm:w-3/4 text-slate-600 dark:text-slate-400">
                衡量帳面利潤是否能實質轉化為現金。當前評為 <span className="text-slate-900 dark:text-slate-200 font-medium">{cashFlow?.status || 'N/A'}</span> ({cfRatio !== null ? `${(cfRatio * 100).toFixed(2)}%` : 'N/A'})。
                自由現金流佔營業現金流大於 50% 評為健康，這意味著公司的利潤「含金量」高，擁有充足的實質支配資金。
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChartContainer>
  );
}
