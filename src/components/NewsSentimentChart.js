"use client";

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine
} from 'recharts';
import ChartContainer from './ChartContainer';

/**
 * News and Social Sentiment Chart Component
 * Visualizes sentiment scores from media publications and social forums.
 * 
 * Why this layout is implemented:
 * - Divergence analysis: By plotting news and social sentiment side-by-side on a -1.0 to 1.0 scale, 
 *   investors can identify discrepancies between institutional media and retail chatter.
 * - ReferenceLine at 0.0 acts as the neutral baseline, making negative sentiment bars 
 *   (red) and positive bars (green/blue) immediately recognizable.
 */
export default function NewsSentimentChart({ newsData = {}, symbol = 'Stock' }) {
  const { financialNews, socialSentiment, majorEvents } = newsData;

  if (!financialNews && !socialSentiment) {
    return (
      <ChartContainer title={`${symbol} 情緒分析`} subtitle="無輿情數據">
        <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
          未提供充足數據進行輿情與事件評估
        </div>
      </ChartContainer>
    );
  }

  const data = [
    {
      name: '財經新聞 (News)',
      score: financialNews?.score ?? 0,
      sentiment: financialNews?.sentiment ?? 'Neutral'
    },
    {
      name: '社交情緒 (Social)',
      score: socialSentiment?.score ?? 0,
      sentiment: socialSentiment?.sentiment ?? 'Neutral'
    }
  ];

  return (
    <ChartContainer 
      title={`${symbol} 輿情情緒指標`} 
      subtitle="新聞媒體與社群網路情緒分數對比 (-1.0 至 1.0)"
    >
      <div className="h-72 w-full flex flex-col lg:flex-row items-center gap-6">
        {/* Sentiment Chart */}
        <div className="h-56 w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#E2E8F0" tick={{ fill: '#64748B', fontSize: 10 }} />
              <YAxis domain={[-1, 1]} stroke="#E2E8F0" tick={{ fill: '#64748B', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px'
                }}
              />
              <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1} />
              <Bar dataKey="score" barSize={40}>
                {data.map((entry, index) => {
                  // Blue/Teal for positive, Red for negative
                  const isPositive = entry.score >= 0;
                  const fill = isPositive ? '#06B6D4' : '#F43F5E';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Major Catalyst Events List */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-y-auto max-h-60 justify-start">
          <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            重大事件與催化劑 (Events)
          </h4>
          {majorEvents?.events && majorEvents.events.length > 0 ? (
            <div className="space-y-2">
              {majorEvents.events.map((event, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-lg border text-xs ${
                    event.impact.includes('Positive') ? 'bg-emerald-50/30 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/50' :
                    event.impact.includes('Negative') ? 'bg-rose-50/30 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/50' :
                    'bg-slate-50/50 border-slate-100 dark:bg-slate-800/20 dark:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{event.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${
                      event.impact.includes('Positive') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      event.impact.includes('Negative') ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {event.impact}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed leading-normal">{event.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 text-xs italic py-4">目前無重大公司催化劑事件。</div>
          )}
        </div>
      </div>
    </ChartContainer>
  );
}
