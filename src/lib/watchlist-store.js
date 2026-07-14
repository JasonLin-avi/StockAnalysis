// src/lib/watchlist-store.js
const STORAGE_KEY = 'stock-analysis-watchlist';

function getWatchlist() {
  if (typeof window === 'undefined') return [];
  try {
    if (!window.localStorage) return [];
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to get watchlist:', e);
    return [];
  }
}

function saveWatchlist(list) {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new window.CustomEvent('watchlist-updated'));
    }
  } catch (e) {
    console.error('Failed to save watchlist:', e);
    // Gracefully handle QuotaExceededError or SecurityError
  }
}

function addWatch(symbol) {
  const list = getWatchlist();
  if (!list.includes(symbol)) {
    list.push(symbol);
    saveWatchlist(list);
  }
}

function removeWatch(symbol) {
  const list = getWatchlist();
  const newList = list.filter(s => s !== symbol);
  if (newList.length !== list.length) {
    saveWatchlist(newList);
  }
}

module.exports = { getWatchlist, addWatch, removeWatch };
