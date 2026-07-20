'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '../../components/Header';

export default function FundsFlowPage() {
  const [market, setMarket] = useState('US');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);

  // Calculate 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const minDate = thirtyDaysAgo.toISOString().split('T')[0];
  const maxDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData(market, date);
  }, [market, date]);

  const fetchData = async (m, d) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market/funds-flow?market=${m}&date=${d}`);
      if (!res.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await res.json();
      setContent(data.content);
    } catch (err) {
      setError(err.message);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-200">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold text-white mb-8">市場資金流向分析</h1>
        
        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-[#0E1524] p-4 rounded-xl border border-slate-800">
          <div className="flex bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => setMarket('US')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                market === 'US' ? 'bg-cyan-900/50 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              美股資金流向
            </button>
            <button
              onClick={() => setMarket('TW')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                market === 'TW' ? 'bg-cyan-900/50 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              台股資金流向
            </button>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-slate-400">分析基準日:</label>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
              <div className="h-4 bg-slate-800 rounded w-5/6"></div>
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="h-4 bg-slate-800 rounded w-2/3"></div>
              <div className="mt-8 text-cyan-400 font-mono text-sm flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                AI 正在檢索市場大數據並進行深度量化分析中...
              </div>
            </div>
          ) : error ? (
            <div className="text-rose-400">
              <p>分析過程發生錯誤：{error}</p>
            </div>
          ) : (
            <div className="max-w-none text-slate-300 font-sans space-y-4 markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
