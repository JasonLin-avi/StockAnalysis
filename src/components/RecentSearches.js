'use client';

/**
 * @fileoverview RecentSearches component.
 * 
 * We declare this as a client-side component because it relies on the browser's 
 * localStorage API and performs asynchronous data fetching directly from the client.
 */

import React, { useState, useEffect } from 'react';

export default function RecentSearches() {
  const [stocks, setStocks] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  // We read from localStorage inside a useEffect hook to guarantee that this code
  // only executes on the client, avoiding hydration mismatches or ReferenceErrors during SSR.
  useEffect(() => {
    try {
      const storedStr = localStorage.getItem('antigravity_recent_stocks');
      if (storedStr) {
        const parsed = JSON.parse(storedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStocks(parsed);
          // Batch fetch live prices immediately for the history list to show updated values.
          fetchPrices(parsed);
          return;
        }
      }
    } catch (err) {
      // Log errors locally but fail gracefully so that localStorage corruption does
      // not crash the entire application dashboard.
      console.error(err);
    }
    setLoading(false);
  }, []);

  /**
   * Fetches prices for a list of stocks.
   * 
   * We batch multiple symbols into a single query param to minimize the number
   * of HTTP roundtrips, reducing server load and speeding up UI updates.
   */
  const fetchPrices = async (list) => {
    try {
      const symbols = list.map(item => encodeURIComponent(item.symbol)).join(',');
      const res = await fetch(`/api/prices?symbols=${symbols}`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (err) {
      // Fail silently and keep the default 'N/A' states if the network is down or throttled.
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // If there are no search records, we completely hide this section (return null)
  // to avoid rendering empty boxes or headings that disrupt the layout flow.
  if (stocks.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl relative z-10 mt-12 pt-12 border-t border-slate-900">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center mb-6">
        最近搜尋標的
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stocks.map((stock) => {
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
