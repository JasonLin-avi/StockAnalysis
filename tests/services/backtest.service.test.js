import { 
  splitHistoricalKlines,
  getCachedBacktestRecord,
  saveBacktestForecast,
  updateBacktestEvaluation
} from '../../src/services/backtest.service';
import { connectToDatabase } from '../../src/external/database/connection';

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

describe('Backtest Database Cache Service Helpers', () => {
  beforeAll(async () => {
    await connectToDatabase(':memory:');
  });

  const queryParams = {
    symbol: '2330.TW',
    cutoffDate: '2024-03-01',
    lookbackDays: 60,
    predictionDays: 20
  };

  const sampleForecast = {
    analysis: 'Strong momentum detected',
    targetPrice: 800,
    confidence: 'high'
  };

  const sampleEvaluation = {
    actualReturn: 12.5,
    isCorrect: true,
    score: 85
  };

  test('getCachedBacktestRecord returns null when no record exists', async () => {
    const record = await getCachedBacktestRecord(queryParams);
    expect(record).toBeNull();
  });

  test('saveBacktestForecast inserts record and getCachedBacktestRecord retrieves forecast', async () => {
    await saveBacktestForecast({
      ...queryParams,
      forecast: sampleForecast
    });

    const record = await getCachedBacktestRecord(queryParams);
    expect(record).not.toBeNull();
    expect(record.forecast).toEqual(sampleForecast);
    expect(record.evaluation).toBeNull();
  });

  test('updateBacktestEvaluation updates existing record with evaluation data', async () => {
    await updateBacktestEvaluation({
      ...queryParams,
      evaluation: sampleEvaluation
    });

    const record = await getCachedBacktestRecord(queryParams);
    expect(record).not.toBeNull();
    expect(record.forecast).toEqual(sampleForecast);
    expect(record.evaluation).toEqual(sampleEvaluation);
  });

  test('saveBacktestForecast updates existing record when replaced (INSERT OR REPLACE)', async () => {
    const updatedForecast = { ...sampleForecast, targetPrice: 850 };
    await saveBacktestForecast({
      ...queryParams,
      forecast: updatedForecast
    });

    const record = await getCachedBacktestRecord(queryParams);
    expect(record.forecast).toEqual(updatedForecast);
  });
});

