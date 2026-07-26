import { calculateBacktest }  from '../../src/lib/technical-analysis/backtest';

describe('Backtest Engine Mathematical Verification', () => {
  test('should return correct win rates and similarity rankings', () => {
    // 建立模擬的 100 天價格序列，每天微幅上漲
    const prices = Array.from({ length: 100 }, (_, i) => ({
      date: new Date(2023, 0, i + 1).toISOString().slice(0, 10),
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100.5 + i,
      volume: 100000
    }));

    const result = calculateBacktest(prices);
    expect(result).toHaveProperty('winRate5d');
    expect(result).toHaveProperty('winRate10d');
    expect(result.similarDays.length).toBeGreaterThan(0);
    expect(result.similarDays[0]).toHaveProperty('similarity');
  });
});
