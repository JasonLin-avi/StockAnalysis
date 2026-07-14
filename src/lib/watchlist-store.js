// src/lib/watchlist-store.js
const STORAGE_KEY = 'stock-analysis-watchlist';

function getWatchlist() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveWatchlist(list) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new window.CustomEvent('watchlist-updated'));
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
