'use client';

/**
 * @fileoverview HistoryTracker component.
 * 
 * This is a behavior-only React component that automatically updates the user's
 * stock search history in localStorage. It is designed to be invisible and does
 * not render any UI markup.
 */

import { useEffect } from 'react';

export default function HistoryTracker({ symbol, name }) {
  useEffect(() => {
    // Only track if a valid symbol is provided, as empty searches are not meaningful.
    if (!symbol) return;

    try {
      const storedStr = localStorage.getItem('antigravity_recent_stocks');
      let list = storedStr ? JSON.parse(storedStr) : [];
      
      // Guarantee that list is an array to prevent runtime crashes if localStorage 
      // was corrupted or written with a different data structure previously.
      if (!Array.isArray(list)) list = [];

      // Deduplicate the list and ensure the current symbol is placed at the very front.
      // We do this to reflect the chronological order of user access (most recent first).
      list = list.filter(item => item.symbol !== symbol);
      list.unshift({ symbol, name: name || symbol });

      // Limit the history to 8 entries to avoid consuming excessive localStorage space
      // and keep the history section in the UI clean and fast to render.
      if (list.length > 8) {
        list = list.slice(0, 8);
      }

      localStorage.setItem('antigravity_recent_stocks', JSON.stringify(list));
    } catch (err) {
      // Catching errors to prevent the entire application from crashing if localStorage is 
      // disabled (e.g., in private browsing mode, iframe environments, or when storage quota is exceeded).
      console.error('Failed to write history to localStorage:', err);
    }
  }, [symbol, name]);

  // HistoryTracker is a behavioral component designed purely to synchronize state
  // to localStorage on mount/update. It does not render any visual elements.
  return null;
}
