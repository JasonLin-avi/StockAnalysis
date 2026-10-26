import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { connectToDatabase } from '../../external/database/connection';
import { getAllAnalyzedStocks } from '../../external/database/queries';
import { FolderIcon, DownloadIcon, ChartBarIcon } from '../../components/ui/Icons';

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
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="mb-8 pb-4 border-b border-slate-800/80">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">歷史分析報告</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">所有已儲存並持久化至資料庫中的分析報告清單。</p>
        </div>

        {errorMsg && (
          <div className="border border-red-900 bg-red-950/20 rounded-2xl p-6 mb-8 text-red-400 text-sm">
            無法讀取資料庫報告：{errorMsg}
          </div>
        )}

        {reports.length === 0 ? (
          <div className="border border-slate-800/80 bg-[#0B0F19]/60 rounded-2xl p-12 text-center text-slate-400 max-w-lg mx-auto">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
              <FolderIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300 mb-2">尚未在資料庫中生成任何分析報告</p>
            <p className="text-xs text-slate-500 mb-6">在市場看板搜尋個股並執行分析後，系統將自動為您保存歷史記錄。</p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
            >
              返回首頁進行搜尋分析
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  className="border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {report.name && report.name !== report.symbol && !/^[A-Za-z0-9 .,&()'-]+$/.test(report.name)
                          ? `${report.name} (${report.symbol})`
                          : report.symbol}
                      </h2>
                      <p className="text-xs text-slate-500 font-mono mt-1">分析日期: {report.date}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColors[action] || badgeColors.Hold}`}>
                      {action}
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 mb-6 line-clamp-2">
                    {buySell.summary || '評估完成，維持當前策略。'}
                  </p>

                  <div className="flex gap-3">
                    <Link
                      href={`/stock/${report.symbol}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-center rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold py-2.5 text-slate-200 transition-all hover:text-white"
                    >
                      <ChartBarIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>查看儀表板</span>
                    </Link>
                    <a
                      href={`/api/report?symbol=${report.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-center rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold py-2.5 text-cyan-300 transition-all"
                    >
                      <DownloadIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>下載報告</span>
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
