import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
const { connectToDatabase } = require('../../lib/database/connection');
const { getAllAnalyzedStocks } = require('../../lib/database/queries');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
  let reports = [];
  let errorMsg = null;

  try {
    const db = await connectToDatabase();
    reports = await getAllAnalyzedStocks(db);
  } catch (err) {
    console.error('Error loading reports:', err);
    errorMsg = err.message;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">歷史分析報告</h1>
          <p className="text-sm text-slate-400 mt-2">所有已儲存並持久化至資料庫中的分析報告清單。</p>
        </div>

        {errorMsg && (
          <div className="border border-red-900 bg-red-950/20 rounded-2xl p-6 mb-8 text-red-400 text-sm">
            無法讀取資料庫報告：{errorMsg}
          </div>
        )}

        {reports.length === 0 ? (
          <div className="border border-slate-900 bg-slate-900/10 rounded-2xl p-12 text-center text-slate-400">
            <p className="mb-6">📂 尚未在資料庫中生成任何分析報告。</p>
            <Link href="/" className="inline-block rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg">
              返回首頁進行搜尋分析
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => {
              const advice = report.advice || {};
              const buySell = advice.buySell || {};
              const action = buySell.action || 'Hold';
              
              const badgeColors = {
                Buy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                Sell: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                Hold: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              };

              return (
                <div
                  key={report.symbol}
                  className="border border-slate-900 bg-slate-900/20 rounded-2xl p-6 hover:border-slate-800 transition-all flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">{report.symbol}</h2>
                      <p className="text-xs text-slate-500 font-mono mt-1">分析日期: {report.date}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColors[action] || badgeColors.Hold}`}>
                      {action}
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 mb-6 line-clamp-2">
                    {buySell.summary || '評估完成，維持當前策略。'}
                  </p>

                  <div className="flex gap-4">
                    <Link
                      href={`/stock/${report.symbol}`}
                      className="flex-1 text-center rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold py-2.5 text-slate-200 transition-all"
                    >
                      🖥️ 儀表板
                    </Link>
                    <a
                      href={`/api/report?symbol=${report.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-xs font-semibold py-2.5 text-indigo-400 transition-all"
                    >
                      📄 下載報告
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
