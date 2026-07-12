/**
 * Unit tests for the Technical Analysis Engine.
 * Tests MA, RSI, MACD calculations and integration.
 */

const { calculateMA } = require('../../src/lib/technical-analysis/ma');
const { calculateRSI } = require('../../src/lib/technical-analysis/rsi');
const { calculateMACD, calculateEMA } = require('../../src/lib/technical-analysis/macd');
const { performTechnicalAnalysis } = require('../../src/lib/technical-analysis/index');

// ---------------------------------------------------------------------------
// MA Tests
// ---------------------------------------------------------------------------
describe('calculateMA (Simple Moving Average)', () => {

  test('returns correct SMA for basic dataset', () => {
    const prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const period = 3;
    const result = calculateMA(prices, period);

    expect(result).toHaveLength(prices.length);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();

    // At index 2: (1+2+3)/3 = 2
    expect(result[2]).toBeCloseTo(2, 10);
    // At index 3: (2+3+4)/3 = 3
    expect(result[3]).toBeCloseTo(3, 10);
    // At index 4: (3+4+5)/3 = 4
    expect(result[4]).toBeCloseTo(4, 10);
    // At index 9: (8+9+10)/3 = 9
    expect(result[9]).toBeCloseTo(9, 10);
  });

  test('returns all null for period > length', () => {
    const prices = [1, 2, 3];
    const result = calculateMA(prices, 10);
    expect(result).toHaveLength(3);
    expect(result.every(v => v === null)).toBe(true);
  });

  test('returns empty array for empty input', () => {
    expect(calculateMA([], 5)).toEqual([]);
  });

  test('returns copies of prices for period 1', () => {
    const prices = [10, 20, 30, 40];
    const result = calculateMA(prices, 1);
    expect(result).toEqual([10, 20, 30, 40]);
  });

  test('handles non-array input gracefully', () => {
    expect(calculateMA(null, 5)).toEqual([]);
    expect(calculateMA(undefined, 5)).toEqual([]);
  });

  test('returns nulls before period window for larger dataset', () => {
    const prices = [5, 10, 15, 20, 25, 30];
    const period = 4;
    const result = calculateMA(prices, period);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull();
    expect(result[3]).toBeCloseTo(12.5, 10);
    expect(result[4]).toBeCloseTo(17.5, 10);
    expect(result[5]).toBeCloseTo(22.5, 10);
  });
});

// ---------------------------------------------------------------------------
// RSI Tests
// ---------------------------------------------------------------------------
describe('calculateRSI (Relative Strength Index)', () => {

  test('returns null for indices < period', () => {
    const prices = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08,
                    45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 46.21];
    const period = 14;
    const rsi = calculateRSI(prices, period);
    expect(rsi).toHaveLength(prices.length);
    for (let i = 0; i < period; i++) {
      expect(rsi[i]).toBeNull();
    }
  });

  test('calculates known RSI values using Wilder' + "'" + 's Smoothing', () => {
    const prices = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08,
                    45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 46.21];
    const period = 14;
    const rsi = calculateRSI(prices, period);

    // First RSI at index 14: avgGain=0.258571, avgLoss=0.095714, RS=2.701, RSI=72.98
    expect(rsi[14]).toBeCloseTo(72.98, 1);

    // Index 15: change=-0.28, avgGain=0.2401, avgLoss=0.1089, RS=2.205, RSI=68.80
    expect(rsi[15]).toBeCloseTo(68.80, 1);

    // Index 16: change=+0.03, avgGain=0.2251, avgLoss=0.1011, RS=2.226, RSI=69.01
    expect(rsi[16]).toBeCloseTo(69.01, 1);
  });

  test('returns RSI of 100 when all prices go up', () => {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const rsi = calculateRSI(prices, 14);
    expect(rsi[14]).toBe(100);
    expect(rsi[15]).toBe(100);
  });

  test('returns RSI of 0 when all prices go down', () => {
    const prices = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
    const rsi = calculateRSI(prices, 14);
    expect(rsi[14]).toBe(0);
    expect(rsi[15]).toBe(0);
  });

  test('returns RSI of 100 for constant prices', () => {
    const prices = Array(20).fill(100);
    const rsi = calculateRSI(prices, 14);
    expect(rsi[14]).toBe(100);
    for (let i = 15; i < 20; i++) {
      expect(rsi[i]).toBe(100);
    }
  });

  test('returns all nulls when prices length <= period', () => {
    const prices = [10, 11, 12, 13, 14];
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toHaveLength(5);
    expect(rsi.every(v => v === null)).toBe(true);
  });

  test('returns all nulls for empty array', () => {
    const rsi = calculateRSI([], 14);
    expect(rsi).toEqual([]);
  });

  test('uses default period of 14', () => {
    const prices = Array(20).fill(100);
    const rsiDefault = calculateRSI(prices);
    const rsiExplicit = calculateRSI(prices, 14);
    expect(rsiDefault).toEqual(rsiExplicit);
  });
});

// ---------------------------------------------------------------------------
// MACD Tests
// ---------------------------------------------------------------------------
describe('calculateMACD (Moving Average Convergence Divergence)', () => {

  test('returns object with correct keys', () => {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39];
    const result = calculateMACD(prices);
    expect(result).toHaveProperty('macdLine');
    expect(result).toHaveProperty('signalLine');
    expect(result).toHaveProperty('histogram');
  });

  test('returns arrays of same length as input', () => {
    const prices = Array(30).fill(100).map((v, i) => v + i);
    const result = calculateMACD(prices);
    expect(result.macdLine).toHaveLength(30);
    expect(result.signalLine).toHaveLength(30);
    expect(result.histogram).toHaveLength(30);
  });

  test('returns null for early indices in macdLine', () => {
    const prices = Array(30).fill(100).map((v, i) => v + i);
    const result = calculateMACD(prices);
    for (let i = 0; i < 25; i++) {
      expect(result.macdLine[i]).toBeNull();
    }
    expect(result.macdLine[25]).not.toBeNull();
  });

  test('MACD Line = EMA(fast) - EMA(slow) for valid range', () => {
    const prices = [10, 12, 15, 14, 13, 16, 18, 17, 19, 21, 20, 22, 24, 23, 25, 27, 26, 28, 30, 29,
                    31, 33, 32, 34, 36, 35, 37, 39, 38, 40];
    const fastPeriod = 5;
    const slowPeriod = 8;
    const signalPeriod = 3;
    const result = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);

    const emaFast = calculateEMA(prices, fastPeriod);
    const emaSlow = calculateEMA(prices, slowPeriod);

    const startIndex = Math.max(fastPeriod, slowPeriod) - 1;
    for (let i = startIndex; i < prices.length; i++) {
      expect(result.macdLine[i]).toBeCloseTo(emaFast[i] - emaSlow[i], 8);
    }
  });

  test('Histogram = MACD Line - Signal Line', () => {
    const prices = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08,
                    45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 46.21,
                    46.5, 47.0, 46.8, 47.2, 47.5, 47.3, 47.8, 48.0, 47.6, 48.2];
    const result = calculateMACD(prices);
    for (let i = 0; i < prices.length; i++) {
      if (result.macdLine[i] !== null && result.signalLine[i] !== null) {
        expect(result.histogram[i]).toBeCloseTo(result.macdLine[i] - result.signalLine[i], 10);
      } else {
        expect(result.histogram[i]).toBeNull();
      }
    }
  });

  test('returns empty arrays for empty input', () => {
    const result = calculateMACD([]);
    expect(result).toEqual({ macdLine: [], signalLine: [], histogram: [] });
  });

  test('handles single element array (all values are null)', () => {
    // With default periods 12/26/9, MACD requires at least 26 elements
    const result = calculateMACD([100]);
    expect(result.macdLine).toHaveLength(1);
    expect(result.macdLine[0]).toBeNull();
    expect(result.signalLine[0]).toBeNull();
    expect(result.histogram[0]).toBeNull();
  });

  test('handles constant prices (MACD should be 0 after seed)', () => {
    const prices = Array(40).fill(100);
    const result = calculateMACD(prices);
    const startIndex = Math.max(12, 26) - 1;
    for (let i = startIndex; i < prices.length; i++) {
      expect(result.macdLine[i]).toBeCloseTo(0, 8);
    }
  });
});

// ---------------------------------------------------------------------------
// EMA Helper Tests
// ---------------------------------------------------------------------------
describe('calculateEMA (Exponential Moving Average)', () => {

  test('returns correct EMA values', () => {
    const prices = [10, 11, 12, 13, 14, 15];
    const period = 3;
    const ema = calculateEMA(prices, period);
    expect(ema).toHaveLength(6);

    // First EMA at index 2: SMA(10,11,12) = 11
    expect(ema[2]).toBeCloseTo(11, 10);

    // At index 3: (13 - 11) * (2/(3+1)) + 11 = 12
    expect(ema[3]).toBeCloseTo(12, 10);

    // At index 4: (14 - 12) * 0.5 + 12 = 13
    expect(ema[4]).toBeCloseTo(13, 10);

    // At index 5: (15 - 13) * 0.5 + 13 = 14
    expect(ema[5]).toBeCloseTo(14, 10);
  });

  test('returns empty array for empty input', () => {
    expect(calculateEMA([], 5)).toEqual([]);
  });

  test('handles period of 1', () => {
    const prices = [10, 20, 30];
    const ema = calculateEMA(prices, 1);
    expect(ema[0]).toBeCloseTo(10, 10);
    expect(ema[1]).toBeCloseTo(20, 10);
    expect(ema[2]).toBeCloseTo(30, 10);
  });
});

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------
describe('performTechnicalAnalysis', () => {

  test('runs all three indicators on valid data', () => {
    const data = {
      prices: [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08,
               45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 46.21,
               46.5, 47.0, 46.8, 47.2, 47.5, 47.3, 47.8, 48.0, 47.6, 48.2]
    };
    const result = performTechnicalAnalysis(data);

    expect(result).toHaveProperty('ma');
    expect(result).toHaveProperty('rsi');
    expect(result).toHaveProperty('macd');
    expect(result.macd).toHaveProperty('macdLine');
    expect(result.macd).toHaveProperty('signalLine');
    expect(result.macd).toHaveProperty('histogram');

    expect(result.ma).toHaveLength(data.prices.length);
    expect(result.rsi).toHaveLength(data.prices.length);
    expect(result.macd.macdLine).toHaveLength(data.prices.length);
  });

  test('returns empty arrays for empty prices', () => {
    const result = performTechnicalAnalysis({ prices: [] });
    expect(result).toEqual({
      ma: [],
      rsi: [],
      macd: { macdLine: [], signalLine: [], histogram: [] }
    });
  });

  test('handles missing prices gracefully', () => {
    const result = performTechnicalAnalysis({});
    expect(result).toEqual({
      ma: [],
      rsi: [],
      macd: { macdLine: [], signalLine: [], histogram: [] }
    });
  });

  test('handles null input gracefully', () => {
    const result = performTechnicalAnalysis(null);
    expect(result).toEqual({
      ma: [],
      rsi: [],
      macd: { macdLine: [], signalLine: [], histogram: [] }
    });
  });

  test('MA uses default period of 20', () => {
    const prices = Array(25).fill(100);
    const result = performTechnicalAnalysis({ prices });
    expect(result.ma[18]).toBeNull();
    expect(result.ma[19]).not.toBeNull();
  });

  test('RSI uses default period of 14', () => {
    const prices = Array(20).fill(100);
    const result = performTechnicalAnalysis({ prices });
    expect(result.rsi[13]).toBeNull();
    expect(result.rsi[14]).not.toBeNull();
  });

  test('MACD uses default periods (12, 26, 9)', () => {
    const prices = Array(35).fill(100);
    const result = performTechnicalAnalysis({ prices });
    // MACD line starts at max(12,26)-1 = 25
    expect(result.macd.macdLine[24]).toBeNull();
    expect(result.macd.macdLine[25]).not.toBeNull();
  });
});
