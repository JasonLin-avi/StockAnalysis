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
      subtitle="綜合財務指標歸一化百分制評估"
    >
      <div className="h-72 w-full flex flex-col md:flex-row items-center justify-around gap-4">
        {/* Radar Chart Visual */}
        <div className="h-60 w-full md:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#F1F5F9" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10 }} />
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
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
            <div className="text-slate-400 dark:text-slate-500 mb-0.5">市盈率 P/E</div>
            <div className="font-semibold text-slate-700 dark:text-slate-200">
              {pe?.value !== null ? `${pe?.value}x` : 'N/A'}
            </div>
            <div className={`text-[10px] mt-0.5 ${
              pe?.status === 'Undervalued' ? 'text-emerald-500 font-medium' :
              pe?.status === 'Fair' ? 'text-amber-500' : 'text-slate-400'
            }`}>
              {pe?.status}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
            <div className="text-slate-400 dark:text-slate-500 mb-0.5">每股收益 EPS</div>
            <div className="font-semibold text-slate-700 dark:text-slate-200">
              {eps?.value !== null ? `${eps?.value}` : 'N/A'}
            </div>
            <div className={`text-[10px] mt-0.5 ${
              eps?.status === 'Strong' ? 'text-emerald-500 font-medium' : 'text-slate-400'
            }`}>
              {eps?.trend !== 'N/A' ? `${eps?.trend} (${eps?.status})` : eps?.status}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
            <div className="text-slate-400 dark:text-slate-500 mb-0.5">負債比率 Debt</div>
            <div className="font-semibold text-slate-700 dark:text-slate-200">
              {debtRatio?.value !== null ? `${(debtRatio?.value * 100).toFixed(2)}%` : 'N/A'}
            </div>
            <div className={`text-[10px] mt-0.5 ${
              debtRatio?.status === 'Healthy' ? 'text-emerald-500 font-medium' :
              debtRatio?.status === 'Moderate' ? 'text-amber-500' : 'text-red-500'
            }`}>
              {debtRatio?.status}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
            <div className="text-slate-400 dark:text-slate-500 mb-0.5">營收成長 Revenue</div>
            <div className="font-semibold text-slate-700 dark:text-slate-200">
              {revenueGrowth?.value !== null ? `${(revenueGrowth?.value * 100).toFixed(2)}%` : 'N/A'}
            </div>
            <div className={`text-[10px] mt-0.5 ${
              revenueGrowth?.status === 'High Growth' ? 'text-emerald-500 font-medium' :
              revenueGrowth?.status === 'Stable Growth' ? 'text-slate-500' : 'text-red-500'
            }`}>
              {revenueGrowth?.status}
            </div>
          </div>
        </div>
      </div>
    </ChartContainer>
  );
}
