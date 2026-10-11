import { calculateKD } from '../../src/lib/technical-analysis/kd';

describe('KD Technical Indicator Module', () => {
  test('returns default 50 for all points when prices array is shorter than period', () => {
    const shortPrices = [
      { date: '2026-01-01', high: 105, low: 95, close: 100 },
      { date: '2026-01-02', high: 106, low: 96, close: 102 }
    ];

    const result = calculateKD(shortPrices, 9, 3, 3);
    expect(result.k).toHaveLength(2);
    expect(result.d).toHaveLength(2);
    expect(result.k[0].value).toBe(50);
    expect(result.k[1].value).toBe(50);
    expect(result.d[0].value).toBe(50);
    expect(result.d[1].value).toBe(50);
    expect(result.latest.k).toBe(50);
    expect(result.latest.d).toBe(50);
    expect(result.latest.status).toBe('資料不足 (基準50)');
  });

  test('correctly calculates KD(9,3,3) for synthetic price series', () => {
    const prices = [];
    // 20 bars with steady uptrend
    for (let i = 0; i < 20; i++) {
      prices.push({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        high: 100 + i * 2 + 1,
        low: 100 + i * 2 - 1,
        close: 100 + i * 2
      });
    }

    const result = calculateKD(prices, 9, 3, 3);
    expect(result.k).toHaveLength(20);
    expect(result.d).toHaveLength(20);

    // Initial warm-up bars prior to index 8 should be 50
    for (let i = 0; i < 8; i++) {
      expect(result.k[i].value).toBe(50);
      expect(result.d[i].value).toBe(50);
    }

    // Latest bar in steady uptrend should reflect high momentum (K > 60)
    expect(result.latest.k).toBeGreaterThan(60);
    expect(result.latest.d).toBeGreaterThan(50);
  });

  test('handles zero price range by defaulting RSV to 50', () => {
    const flatPrices = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      high: 100,
      low: 100,
      close: 100
    }));

    const result = calculateKD(flatPrices, 9, 3, 3);
    expect(result.latest.k).toBe(50);
    expect(result.latest.d).toBe(50);
  });

  test('handles empty or invalid inputs gracefully', () => {
    const emptyResult = calculateKD([]);
    expect(emptyResult.k).toEqual([]);
    expect(emptyResult.d).toEqual([]);
    expect(emptyResult.latest.k).toBe(50);
    expect(emptyResult.latest.d).toBe(50);
    expect(emptyResult.latest.status).toBe('無資料');

    const nullResult = calculateKD(null);
    expect(nullResult.k).toEqual([]);
    expect(nullResult.d).toEqual([]);
    expect(nullResult.latest.k).toBe(50);
    expect(nullResult.latest.d).toBe(50);
    expect(nullResult.latest.status).toBe('無資料');
  });

  test('supports prices with time instead of date', () => {
    const pricesWithTime = [
      { time: '2026-01-01', high: 105, low: 95, close: 100 }
    ];
    const result = calculateKD(pricesWithTime, 9, 3, 3);
    expect(result.k[0].time).toBe('2026-01-01');
    expect(result.d[0].time).toBe('2026-01-01');
  });
});
