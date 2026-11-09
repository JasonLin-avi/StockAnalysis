'use client';

import React from 'react';

/**
 * @fileoverview Glassmorphic Skeleton Loading Components
 * 
 * Why these components are designed:
 * - Replaces simple spinning loaders with structured, glassmorphic layout skeletons.
 * - Prevents cumulative layout shift (CLS) by reserving exact vertical and horizontal space.
 * - Uses Tailwind dark theme tokens (#0B0F19, slate-800, slate-900) and smooth pulse animations.
 */

/**
 * Base atomic Skeleton block with pulse animation
 */
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-800/60 rounded-xl ${className}`}
      {...props}
    />
  );
}

/**
 * Full Kline Chart & KD Sub-Chart & Summary Panel Skeleton
 */
export function KlineChartSkeleton() {
  return (
    <div className="space-y-6" data-testid="kline-chart-skeleton">
      {/* Chart Top Toolbar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0B0F19]/80 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-xl bg-cyan-500/10" />
          <div className="space-y-1.5">
            <Skeleton className="w-48 h-5" />
            <Skeleton className="w-24 h-3 bg-slate-800/40" />
          </div>
        </div>

        {/* Range and Interval Selector Placeholders */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
            {['1M', '3M', '6M', '1Y', '3Y'].map((r) => (
              <Skeleton key={r} className="w-10 h-7 rounded-lg" />
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
            {['日K', '週K', '月K'].map((i) => (
              <Skeleton key={i} className="w-12 h-7 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Chart Canvas (Left) + Summary Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Main Candlestick Canvas Skeleton */}
          <div className="border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl p-4 backdrop-blur-md min-h-[440px] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-16 h-4" />
              </div>
              <Skeleton className="w-28 h-4" />
            </div>

            {/* Simulated Candle Stems and Horizontal Grid Lines */}
            <div className="h-64 flex items-end justify-between px-4 gap-2 opacity-30">
              {[40, 65, 50, 80, 45, 90, 75, 60, 85, 95, 70, 80].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-slate-700 rounded-sm animate-pulse"
                    style={{ height: `${h}%` }}
                  />
                  <div
                    className="w-full bg-cyan-700/50 rounded-sm animate-pulse"
                    style={{ height: `${h * 0.4}%` }}
                  />
                </div>
              ))}
            </div>

            {/* Bottom Timeline Axis Skeleton */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/40">
              <Skeleton className="w-16 h-3" />
              <Skeleton className="w-16 h-3" />
              <Skeleton className="w-16 h-3" />
              <Skeleton className="w-16 h-3" />
              <Skeleton className="w-16 h-3" />
            </div>
          </div>

          {/* KD Subchart Skeleton */}
          <div className="border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl p-4 backdrop-blur-md min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-12 h-3" />
                <Skeleton className="w-12 h-3" />
              </div>
              <Skeleton className="w-20 h-4 rounded-full" />
            </div>
            <div className="h-16 flex items-center justify-center">
              <Skeleton className="w-full h-8 bg-slate-800/30" />
            </div>
          </div>
        </div>

        {/* Technical Summary Diagnostics Panel Skeleton */}
        <div className="lg:col-span-1 border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="w-28 h-5" />
          </div>

          {/* Metric Rows */}
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 space-y-2">
              <div className="flex justify-between items-center">
                <Skeleton className="w-16 h-3" />
                <Skeleton className="w-10 h-3" />
              </div>
              <Skeleton className="w-24 h-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Fundamental Radar Chart & Metrics Cards Skeleton
 */
export function FundamentalAnalysisSkeleton() {
  return (
    <div className="border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6" data-testid="fundamental-skeleton">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="space-y-1.5">
          <Skeleton className="w-48 h-6" />
          <Skeleton className="w-80 h-3.5 bg-slate-800/40" />
        </div>
        <Skeleton className="w-24 h-6 rounded-full" />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
        {/* Radar Spider Simulation Skeleton */}
        <div className="w-full md:w-1/2 flex items-center justify-center h-64">
          <div className="w-52 h-52 rounded-full border-2 border-dashed border-slate-800 animate-pulse flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border border-slate-700/50 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 animate-ping opacity-25" />
            </div>
          </div>
        </div>

        {/* 2x3 Metric Cards Grid Skeleton */}
        <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 text-xs">
          {[1, 2, 3, 4, 5].map((card) => (
            <div key={card} className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <Skeleton className="w-16 h-3" />
              <Skeleton className="w-20 h-5" />
              <Skeleton className="w-12 h-3 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * AI Narrative Analysis Skeleton (for Technical AI & Fundamental Research)
 */
export function AISummarySkeleton({ title = 'AI 分析生成中...' }) {
  return (
    <div className="border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl mt-6 space-y-6" data-testid="ai-summary-skeleton">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl bg-cyan-500/10" />
          <div className="space-y-1.5">
            <Skeleton className="w-56 h-5" />
            <Skeleton className="w-36 h-3.5 bg-slate-800/40" />
          </div>
        </div>
        <Skeleton className="w-28 h-8 rounded-xl" />
      </div>

      {/* Shimmering Text Paragraphs & Bullet Points */}
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs text-cyan-300 font-medium">{title}</span>
        </div>

        <div className="space-y-2.5">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-11/12 h-4" />
          <Skeleton className="w-4/5 h-4" />
        </div>

        <div className="pt-2 space-y-2.5">
          <Skeleton className="w-1/3 h-5" />
          <div className="space-y-2 pl-4 border-l-2 border-slate-800">
            <Skeleton className="w-full h-3.5" />
            <Skeleton className="w-5/6 h-3.5" />
            <Skeleton className="w-3/4 h-3.5" />
          </div>
        </div>

        <div className="pt-2 space-y-2.5">
          <Skeleton className="w-1/4 h-5" />
          <div className="space-y-2 pl-4 border-l-2 border-slate-800">
            <Skeleton className="w-full h-3.5" />
            <Skeleton className="w-2/3 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Historical Backtest Sandbox Skeleton
 */
export function BacktestSkeleton() {
  return (
    <div className="border border-slate-900 bg-slate-900/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6 space-y-6" data-testid="backtest-skeleton">
      <div className="border-b border-slate-800/80 pb-6 space-y-4">
        <div className="flex items-start gap-3.5 w-full">
          <Skeleton className="w-10 h-10 rounded-xl bg-cyan-500/10" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="w-64 h-5" />
            <Skeleton className="w-96 max-w-full h-3.5 bg-slate-800/40" />
          </div>
        </div>

        {/* Inputs row */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
          <Skeleton className="w-full h-10 rounded-xl" />
        </div>
      </div>

      {/* Evaluating pulse state */}
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
        <Skeleton className="w-72 h-4" />
      </div>
    </div>
  );
}

/**
 * Full Stock Detail Page Skeleton Loader
 */
export function StockDetailSkeleton() {
  return (
    <div className="space-y-8 animate-fadeIn" data-testid="stock-detail-skeleton">
      {/* Header Headline Meta Skeleton */}
      <div className="border border-slate-900 bg-slate-900/40 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 backdrop-blur-md">
        <div className="space-y-2">
          <Skeleton className="w-32 h-3" />
          <div className="flex items-baseline gap-3">
            <Skeleton className="w-48 h-8" />
            <Skeleton className="w-20 h-6 rounded-lg" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>

        <div className="text-right space-y-2">
          <Skeleton className="w-28 h-8 ml-auto" />
          <Skeleton className="w-20 h-4 ml-auto" />
        </div>
      </div>

      {/* 3 Tabs Navigation Bar Skeleton */}
      <div className="flex items-center gap-2 p-1.5 border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl backdrop-blur-md w-fit">
        <Skeleton className="w-36 h-9 rounded-xl" />
        <Skeleton className="w-36 h-9 rounded-xl" />
        <Skeleton className="w-36 h-9 rounded-xl" />
      </div>

      {/* Tab Content Skeleton (Default: Kline) */}
      <KlineChartSkeleton />
    </div>
  );
}

export default Skeleton;
