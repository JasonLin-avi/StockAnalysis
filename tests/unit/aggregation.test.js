import { aggregateBars } from '../../src/lib/technical-analysis/aggregation';

describe('Bar Aggregation Utility', () => {
  const dailyPrices = [
    // Week 1: 2026-01-05 (Mon) to 2026-01-09 (Fri)
    { date: '2026-01-05', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
    { date: '2026-01-06', open: 102, high: 108, low: 101, close: 107, volume: 1200 },
    { date: '2026-01-07', open: 107, high: 110, low: 105, close: 109, volume: 1500 },
    { date: '2026-01-08', open: 109, high: 112, low: 108, close: 111, volume: 1100 },
    { date: '2026-01-09', open: 111, high: 115, low: 110, close: 114, volume: 2000 },
    // Week 2: 2026-01-12 (Mon) to 2026-01-13 (Tue)
    { date: '2026-01-12', open: 114, high: 116, low: 112, close: 113, volume: 800 },
    { date: '2026-01-13', open: 113, high: 117, low: 111, close: 116, volume: 900 }
  ];

  test('returns empty array for invalid or empty input', () => {
    expect(aggregateBars(null)).toEqual([]);
    expect(aggregateBars(undefined)).toEqual([]);
    expect(aggregateBars([])).toEqual([]);
    expect(aggregateBars('not an array')).toEqual([]);
    expect(aggregateBars({})).toEqual([]);
  });

  test('returns identical array for 1d interval', () => {
    const result = aggregateBars(dailyPrices, '1d');
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual(dailyPrices[0]);
    expect(result).toEqual(dailyPrices);
  });

  test('correctly aggregates into weekly bars for 1w interval', () => {
    const result = aggregateBars(dailyPrices, '1w');
    expect(result).toHaveLength(2);

    // Week 1 checks
    expect(result[0].date).toBe('2026-01-09'); // last trading day of week
    expect(result[0].open).toBe(100);          // first open
    expect(result[0].high).toBe(115);          // max high
    expect(result[0].low).toBe(98);            // min low
    expect(result[0].close).toBe(114);         // last close
    expect(result[0].volume).toBe(6800);       // sum volume

    // Week 2 checks
    expect(result[1].date).toBe('2026-01-13'); // last trading day of week
    expect(result[1].open).toBe(114);
    expect(result[1].high).toBe(117);
    expect(result[1].low).toBe(111);
    expect(result[1].close).toBe(116);
    expect(result[1].volume).toBe(1700);
  });

  test('correctly aggregates into monthly bars for 1mo interval', () => {
    const multiMonthPrices = [
      { date: '2026-01-15', open: 100, high: 110, low: 95, close: 105, volume: 5000 },
      { date: '2026-01-30', open: 105, high: 115, low: 102, close: 112, volume: 6000 },
      { date: '2026-02-05', open: 112, high: 120, low: 108, close: 118, volume: 4000 }
    ];

    const result = aggregateBars(multiMonthPrices, '1mo');
    expect(result).toHaveLength(2);

    // Jan 2026 checks
    expect(result[0].date).toBe('2026-01-30');
    expect(result[0].open).toBe(100);
    expect(result[0].high).toBe(115);
    expect(result[0].low).toBe(95);
    expect(result[0].close).toBe(112);
    expect(result[0].volume).toBe(11000);

    // Feb 2026 checks
    expect(result[1].date).toBe('2026-02-05');
    expect(result[1].open).toBe(112);
    expect(result[1].high).toBe(120);
    expect(result[1].low).toBe(108);
    expect(result[1].close).toBe(118);
    expect(result[1].volume).toBe(4000);
  });

  test('handles missing or zero volume gracefully', () => {
    const barsWithoutVolume = [
      { date: '2026-01-05', open: 100, high: 105, low: 98, close: 102 },
      { date: '2026-01-06', open: 102, high: 108, low: 101, close: 107, volume: 500 }
    ];

    const result = aggregateBars(barsWithoutVolume, '1w');
    expect(result).toHaveLength(1);
    expect(result[0].volume).toBe(500);
  });
});
