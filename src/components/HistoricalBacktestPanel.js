import React from 'react';

export default function HistoricalBacktestPanel({ backtest = {} }) {
  const similarDays = backtest.similarDays || [];
  
  // Why: Provide fallback values for currentPattern to prevent UI crashes if backtest runs on stock with insufficient history (< 50 days).
  const currentPattern = backtest.currentPattern || { rsi: 0, ma20Bias: 0, macdRatio: 0 };
  const { winRate5d = 0, winRate10d = 0, winRate20d = 0, avgReturn5d = 0, avgReturn10d = 0, avgReturn20d = 0 } = backtest;

  const getRateColor = (rate) => {
    if (rate >= 0.6) return 'text-emerald-400';
    if (rate <= 0.4) return 'text-rose-400';
    return 'text-slate-400';
  };

  const getReturnColor = (ret) => {
    if (ret > 0) return 'text-emerald-400';
    if (ret < 0) return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className="border border-slate-900 bg-slate-950/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-900">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>📊</span> 歷史相似環境回測
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            基於歐氏距離匹配最近 3 年特徵最相近的 Top 20 個歷史交易日
          </p>
        </div>
        <div className="flex gap-2 mt-3 md:mt-0 text-xs text-slate-400">
          <span className="bg-slate-900 px-3 py-1.5 rounded-full font-mono">
            RSI: {currentPattern.rsi}%
          </span>
          <span className="bg-slate-900 px-3 py-1.5 rounded-full font-mono">
            均線乖離: {currentPattern.ma20Bias}%
          </span>
        </div>
      </div>

      {/* Why: Grouping win rates in a grid provides a scannable snapshot of multi-horizon probability distributions. We enforce whitespace-nowrap and items-end to guarantee perfectly aligned block layouts and heights across all viewport sizes. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: '5天持有期', rate: winRate5d, ret: avgReturn5d },
          { label: '10天持有期', rate: winRate10d, ret: avgReturn10d },
          { label: '20天持有期', rate: winRate20d, ret: avgReturn20d }
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-900/30 border border-slate-900/50 rounded-2xl p-5 flex flex-col justify-between min-h-[110px]">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">{item.label}</span>
            <div className="flex items-end justify-between mt-3">
              <span className={`text-3xl font-extrabold tracking-tight ${getRateColor(item.rate)} leading-none`}>
                {Math.round(item.rate * 100)}%
                <span className="text-xs text-slate-500 font-normal ml-1 font-sans">勝率</span>
              </span>
              <span className={`text-sm font-mono font-semibold ${getReturnColor(item.ret)} leading-none`}>
                {item.ret > 0 ? '+' : ''}{item.ret}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Why: Listing the top 5 similar dates allows users to verify individual historical outcomes and cross-reference with market news on those dates. */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400">Top 5 相似歷史日期表現</h3>
        {similarDays.length === 0 ? (
          <div className="text-slate-500 py-4 text-sm font-semibold border-t border-slate-800/50">
            ⚠ 歷史數據不足，無法列出相似度回測名單。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-semibold">
                  <th className="py-2.5">歷史日期</th>
                  <th>相似度</th>
                  <th>5 日漲跌</th>
                  <th>10 日漲跌</th>
                  <th>20 日漲跌</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50 font-mono text-slate-300">
                {similarDays.slice(0, 5).map((day, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/20">
                    <td className="py-3 text-slate-400 font-semibold">{day.date}</td>
                    <td>{day.similarity}%</td>
                    <td className={getReturnColor(day.return5d)}>{day.return5d > 0 ? '+' : ''}{day.return5d}%</td>
                    <td className={getReturnColor(day.return10d)}>{day.return10d > 0 ? '+' : ''}{day.return10d}%</td>
                    <td className={getReturnColor(day.return20d)}>{day.return20d > 0 ? '+' : ''}{day.return20d}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
