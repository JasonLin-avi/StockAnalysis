'use client';

/**
 * @fileoverview PopularStocks component.
 * 
 * We declare this as a client-side component because it fetches live prices 
 * dynamically using useEffect on the client.
 */

import React, { useState, useEffect } from 'react';

const popularStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: '2330.TW', name: '台積電' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' }
];

export default function PopularStocks() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  // We fetch live prices on mount for the popular stocks list.
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
        // Log errors locally but fail gracefully if the network is down or throttled.
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
  }, []);

  return (
    <div className="w-full max-w-4xl relative z-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center mb-6">
        熱門追蹤標的
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {popularStocks.map((stock) => {
          const priceInfo = prices[stock.symbol];
          return (
            <a
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="group border border-slate-900 bg-slate-900/30 hover:bg-slate-900/60 rounded-2xl p-5 hover:border-slate-800 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-xs text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
                  {stock.name}
                </span>
                <div className="text-lg font-bold text-slate-200 mt-1">
                  {stock.symbol}
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-4">
                {/* We render a pulse loader while fetching so the user is aware data is loading */}
                {loading ? (
                  <>
                    <span className="h-4 w-12 bg-slate-800 rounded animate-pulse" />
                    <span className="h-3 w-10 bg-slate-800 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-slate-300">
                      {priceInfo?.price || 'N/A'}
                    </span>
                    <span className={`text-xs font-semibold ${priceInfo?.color || 'text-slate-500'}`}>
                      {priceInfo?.change || 'N/A'}
                    </span>
                  </>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
