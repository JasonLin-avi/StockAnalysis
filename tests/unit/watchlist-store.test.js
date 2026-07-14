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

  it('adds symbols', () => {
    addWatch('AAPL');
    expect(getWatchlist()).toEqual(['AAPL']);
  });

  it('removes symbols', () => {
    addWatch('AAPL');
    removeWatch('AAPL');
    expect(getWatchlist()).toEqual([]);
  });

  it('does not add duplicate symbols', () => {
    addWatch('AAPL');
    global.window.dispatchEvent.mockClear();
    addWatch('AAPL');
    expect(getWatchlist()).toEqual(['AAPL']);
    expect(global.window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('does not dispatch event when removing non-existent symbol', () => {
    addWatch('AAPL');
    global.window.dispatchEvent.mockClear();
    removeWatch('TSLA');
    expect(getWatchlist()).toEqual(['AAPL']);
    expect(global.window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('dispatches watchlist-updated event', () => {
    addWatch('TSLA');
    expect(global.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'watchlist-updated' }));
  });
});
