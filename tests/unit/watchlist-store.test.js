const { getWatchlist, addWatch, removeWatch } = require('../../src/lib/watchlist-store');

describe('Watchlist Store', () => {
  beforeEach(() => {
    // Mock localStorage
    const store = {};
    global.window = {
      localStorage: {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
      },
      dispatchEvent: jest.fn(),
      CustomEvent: class CustomEvent { constructor(name) { this.name = name; } }
    };
  });

  it('returns empty array initially', () => {
    expect(getWatchlist()).toEqual([]);
  });

  it('adds and removes symbols', () => {
    addWatch('AAPL');
    expect(getWatchlist()).toEqual(['AAPL']);
    removeWatch('AAPL');
    expect(getWatchlist()).toEqual([]);
  });

  it('dispatches watchlist-updated event', () => {
    addWatch('TSLA');
    expect(global.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'watchlist-updated' }));
  });
});
