'use client';

import React, { useState, useEffect } from 'react';

const popularStocks = [
  { 
    symbol: 'AAPL', 
    name: 'Apple Inc.', 
    market: '美股',
    sparkline: 'M0,18 L15,14 L30,19 L45,10 L60,12 L75,6 L90,4'
  },
  { 
    symbol: 'TSLA', 
    name: 'Tesla Inc.', 
    market: '美股',
    sparkline: 'M0,8 L15,12 L30,6 L45,16 L60,14 L75,20 L90,18'
  },
  { 
    symbol: '2330.TW', 
    name: '台積電', 
    market: '台股',
    sparkline: 'M0,20 L15,16 L30,12 L45,14 L60,8 L75,5 L90,2'
  },
  { 
    symbol: 'NVDA', 
    name: 'NVIDIA Corp.', 
    market: '美股',
    sparkline: 'M0,16 L15,18 L30,10 L45,6 L60,8 L75,3 L90,1'
  }
];

export default function PopularStocks() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = popularStocks.map(item => encodeURIComponent(item.symbol)).join(',');
        const res = await fetch(`/api/prices?symbols=${symbols}`);
        if (res.ok) {
          const data = await res.json();
          setPrices(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
  }, []);

  return (
    <div className="w-full max-w-4xl relative z-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
          熱門監控標的 (Popular Watchlist)
        </h2>
        <span className="text-[11px] font-mono text-slate-500">動態趨勢・即時連線</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {popularStocks.map((stock) => {
          const priceInfo = prices[stock.symbol];
          const isPositive = priceInfo?.change?.includes('+');
          const strokeColor = isPositive ? '#10B981' : (priceInfo?.change?.includes('-') ? '#F43F5E' : '#06B6D4');

          return (
            <a
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="group relative border border-slate-800/80 bg-[#0B0F19]/80 hover:bg-[#0E1424] hover:border-cyan-500/40 rounded-xl p-4 transition-all duration-200 shadow-lg hover:shadow-cyan-500/5 flex flex-col justify-between overflow-hidden"
            >
              {/* Subtle card header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors block truncate max-w-[110px]">
                    {stock.name}
                  </span>
                  <div className="text-base font-display font-extrabold text-slate-100 group-hover:text-cyan-400 transition-colors mt-0.5">
                    {stock.symbol}
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-800/60 border border-slate-700/60 px-1.5 py-0.5 rounded">
                  {stock.market}
                </span>
              </div>

              {/* Sparkline & Price container */}
              <div className="mt-6 flex items-end justify-between">
                <div>
                  {loading ? (
                    <div className="space-y-1">
                      <div className="h-4 w-14 bg-slate-800/80 rounded animate-pulse" />
                      <div className="h-3 w-10 bg-slate-800/80 rounded animate-pulse" />
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-mono font-bold text-slate-200">
                        {priceInfo?.price || 'N/A'}
                      </div>
                      <div className={`text-xs font-mono font-semibold ${priceInfo?.color || 'text-slate-500'}`}>
                        {priceInfo?.change || 'N/A'}
                      </div>
                    </div>
                  )}
                </div>

                {/* SVG Micro Sparkline */}
                <div className="w-16 h-8 flex items-center justify-end">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 90 24">
                    <path
                      d={stock.sparkline}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-75 group-hover:opacity-100 transition-opacity"
                    />
                  </svg>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

