"use client";

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import ChartContainer from './ChartContainer';

/**
 * Technical Indicators Chart Component
 * Renders a composed line chart displaying stock closing price alongside its Moving Average (MA).
 * 
 * Why this component is configured with Recharts:
 * - `"use client"` is declared because Recharts depends on browser DOM features and window sizing 
 *   to render SVG elements dynamically.
 * - `ComposedChart` allows rendering multiple data representations (e.g. area for price support 
 *   and lines for MA curves) on a shared X-Axis timeline.
 * - Elegant colors (#0EA5E9 for price, #F59E0B for MA) are curated to align with premium dark/light mode themes,
 *   preventing visual clutter.
 */
export default function TechnicalIndicatorsChart({ historicalData = [], maData = [], symbol = 'Stock' }) {
  // Combine historical pricing and technical MA data for Recharts consumability.
  const chartData = historicalData.map((item, i) => ({
    date: item.date,
    price: item.close,
    ma: maData[i] || null
  })).filter(d => d.price !== null);

  if (chartData.length === 0) {
    return (
      <ChartContainer title={`${symbol} 技術指標`} subtitle="無價格歷史數據">
        <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
          未提供充足數據進行技術指標渲染
        </div>
      </ChartContainer>
    );
  }

  // Find min/max prices to dynamic-scale the Y-axis so price variations remain visible.
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;

  return (
    <ChartContainer 
      title={`${symbol} 技術趨勢`} 
      subtitle={`收盤價與 20 日移動平均線 (MA) — ${chartData.length} 交易日`}
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#94A3B8', fontSize: 10 }} 
              stroke="#E2E8F0"
              tickLine={false}
            />
            <YAxis 
              domain={[minPrice, maxPrice]} 
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              stroke="#E2E8F0"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle" 
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', color: '#64748B' }}
            />
            <Line 
              name="收盤價 (Close)" 
              type="monotone" 
              dataKey="price" 
              stroke="#0EA5E9" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }} 
            />
            <Line 
              name="20 MA" 
              type="monotone" 
              dataKey="ma" 
              stroke="#F59E0B" 
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
