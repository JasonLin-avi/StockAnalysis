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
          // Slice defensively here too — the cap must hold even if localStorage was modified outside
          // of our write path (e.g., manually, by another tab, or by a future migration bug).
          setStocks(parsed.slice(0, 8));
          // Batch fetch live prices immediately for the history list to show updated values.
          fetchPrices(parsed.slice(0, 8));
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
    <div className="w-full max-w-4xl relative z-10 mt-10 pt-10 border-t border-slate-900/80">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
          最近搜尋標的 (Recent Searches)
        </h2>
        <span className="text-[11px] font-mono text-slate-500">歷史紀錄・即時連線</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {stocks.map((stock) => {
          const priceInfo = prices[stock.symbol];
          const isTW = stock.symbol.endsWith('.TW') || stock.symbol.endsWith('.TWO');

          // Why: Priority order for company name:
          // 1. API-returned name (priceInfo.name) — most up-to-date, resolved from stock-map/DB
          // 2. Stored name from localStorage (stock.name)
          // 3. Fallback to symbol itself
          // For TW stocks, reject any name that looks like an English-only or generic name (e.g. still contains '.TW')
          const isValidName = (n) => {
            if (!n) return false;
            if (n === stock.symbol) return false;
            if (n.endsWith('.TW') || n.endsWith('.TWO')) return false;
            // For TW stocks, reject if name is all ASCII (likely English/not yet resolved to Chinese)
            if (isTW && /^[A-Za-z0-9 .,&()'-]+$/.test(n)) return false;
            return true;
          };

          let companyName;
          if (isValidName(priceInfo?.name)) {
            companyName = priceInfo.name;
          } else if (isValidName(stock.name)) {
            companyName = stock.name;
          } else {
            companyName = stock.symbol;
          }

          const marketType = priceInfo?.market || stock.market || (stock.symbol.endsWith('.TW') || stock.symbol.endsWith('.TWO') ? '台股' : '美股');
          const isPositive = priceInfo?.change?.includes('+');
          const strokeColor = isPositive ? '#10B981' : (priceInfo?.change?.includes('-') ? '#F43F5E' : '#06B6D4');
          const defaultSparkline = 'M0,16 L15,12 L30,14 L45,8 L60,10 L75,4 L90,2';

          return (
            <a
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="group relative border border-slate-800/80 bg-[#0B0F19]/80 hover:bg-[#0E1424] hover:border-cyan-500/40 rounded-xl p-4 transition-all duration-200 shadow-lg hover:shadow-cyan-500/5 flex flex-col justify-between overflow-hidden"
            >
              {/* Subtle card header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-300 transition-colors block truncate max-w-[140px]">
                    {companyName}
                  </span>
                  <div className="text-base font-display font-extrabold text-slate-100 group-hover:text-cyan-400 transition-colors mt-0.5">
                    {stock.symbol}
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-800/60 border border-slate-700/60 px-1.5 py-0.5 rounded">
                  {marketType}
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
                      d={defaultSparkline}
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

