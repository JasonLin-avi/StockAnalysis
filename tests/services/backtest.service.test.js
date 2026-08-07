import { splitHistoricalKlines } from '../../src/services/backtest.service';

describe('splitHistoricalKlines', () => {
  const mockKlines = [
    { date: '2024-01-01', close: 100 },
    { date: '2024-01-02', close: 102 },
    { date: '2024-01-03', close: 105 }, // cutoff
    { date: '2024-01-04', close: 108 },
    { date: '2024-01-05', close: 110 }
  ];

  test('correctly splits klines at cutoffDate without lookahead leakage', () => {
    const result = splitHistoricalKlines(mockKlines, '2024-01-03', 2);
    expect(result.pastKlines).toHaveLength(3);
    expect(result.pastKlines[result.pastKlines.length - 1].date).toBe('2024-01-03');
    expect(result.futureKlines).toHaveLength(2);
    expect(result.futureKlines[0].date).toBe('2024-01-04');
    expect(result.futureKlines[1].date).toBe('2024-01-05');
  });

  test('handles non-exact match by filtering dates before and after cutoff', () => {
    const result = splitHistoricalKlines(mockKlines, '2024-01-03T12:00:00', 2);
    expect(result.pastKlines).toHaveLength(3);
    expect(result.futureKlines).toHaveLength(2);
  });

  test('returns empty arrays when klines input is invalid or empty', () => {
    expect(splitHistoricalKlines([], '2024-01-03')).toEqual({ pastKlines: [], futureKlines: [] });
    expect(splitHistoricalKlines(null, '2024-01-03')).toEqual({ pastKlines: [], futureKlines: [] });
  });
});
