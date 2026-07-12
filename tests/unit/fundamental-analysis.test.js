/**
 * Unit tests for the Fundamental Analysis Module.
 * Validates P/E Ratio, EPS, Debt Ratio, Revenue Growth, and Cash Flow calculations.
 */

const {
  performFundamentalAnalysis,
  analyzePERatio,
  analyzeEPS,
  analyzeDebtRatio,
  analyzeRevenueGrowth,
  analyzeCashFlow
} = require('../../src/lib/fundamental-analysis/index');

describe('Fundamental Analysis Engine', () => {

  // ---------------------------------------------------------------------------
  // P/E Ratio Tests
  // ---------------------------------------------------------------------------
  describe('analyzePERatio', () => {
    test('evaluates pre-calculated P/E ratio correctly', () => {
      expect(analyzePERatio({ peRatio: 12.5 })).toEqual({ value: 12.5, status: 'Undervalued', recommendation: 'Buy' });
      expect(analyzePERatio({ peRatio: 20 })).toEqual({ value: 20, status: 'Fair', recommendation: 'Hold' });
      expect(analyzePERatio({ peRatio: 30.2 })).toEqual({ value: 30.2, status: 'Overvalued', recommendation: 'Sell' });
      expect(analyzePERatio({ peRatio: -5.1 })).toEqual({ value: -5.1, status: 'N/A (Loss)', recommendation: 'Avoid' });
    });

    test('calculates P/E ratio dynamically from price and eps', () => {
      // 100 / 8 = 12.5
      expect(analyzePERatio({ price: 100, eps: 8 })).toEqual({ value: 12.5, status: 'Undervalued', recommendation: 'Buy' });
      // 100 / 4 = 25
      expect(analyzePERatio({ price: 100, eps: 4 })).toEqual({ value: 25, status: 'Fair', recommendation: 'Hold' });
      // 100 / -2 = -50
      expect(analyzePERatio({ price: 100, eps: -2 })).toEqual({ value: -50, status: 'N/A (Loss)', recommendation: 'Avoid' });
    });

    test('handles missing or invalid inputs gracefully', () => {
      const defaultValue = { value: null, status: 'N/A', recommendation: 'Hold' };
      expect(analyzePERatio(null)).toEqual(defaultValue);
      expect(analyzePERatio(undefined)).toEqual(defaultValue);
      expect(analyzePERatio({})).toEqual(defaultValue);
      expect(analyzePERatio({ price: 100 })).toEqual(defaultValue);
      expect(analyzePERatio({ eps: 0 })).toEqual(defaultValue);
      expect(analyzePERatio({ peRatio: 'invalid' })).toEqual(defaultValue);
    });
  });

  // ---------------------------------------------------------------------------
  // EPS Tests
  // ---------------------------------------------------------------------------
  describe('analyzeEPS', () => {
    test('evaluates single-period EPS correctly', () => {
      expect(analyzeEPS({ eps: 2.5 })).toEqual({ value: 2.5, trend: 'N/A', status: 'Moderate' });
      expect(analyzeEPS({ eps: -1.2 })).toEqual({ value: -1.2, trend: 'N/A', status: 'Weak' });
      expect(analyzeEPS({ eps: 0 })).toEqual({ value: 0, trend: 'N/A', status: 'Weak' });
    });

    test('analyzes trend and status from historical EPS', () => {
      // Growing trend: 1.5 -> 2.0 (latest)
      expect(analyzeEPS({ historicalEps: [1.0, 1.5, 2.0] })).toEqual({ value: 2.0, trend: 'Growing', status: 'Strong' });
      // Declining trend: 2.5 -> 1.8 (latest)
      expect(analyzeEPS({ historicalEps: [3.0, 2.5, 1.8] })).toEqual({ value: 1.8, trend: 'Declining', status: 'Moderate' });
      // Flat trend: 1.5 -> 1.5 (latest)
      expect(analyzeEPS({ historicalEps: [1.5, 1.5] })).toEqual({ value: 1.5, trend: 'Flat', status: 'Moderate' });
      // Negative EPS but growing trend: -2.0 -> -0.5 (still negative, should be Weak)
      expect(analyzeEPS({ historicalEps: [-2.0, -0.5] })).toEqual({ value: -0.5, trend: 'Growing', status: 'Weak' });
    });

    test('handles missing or invalid inputs gracefully', () => {
      const defaultValue = { value: null, trend: 'N/A', status: 'N/A' };
      expect(analyzeEPS(null)).toEqual(defaultValue);
      expect(analyzeEPS(undefined)).toEqual(defaultValue);
      expect(analyzeEPS({})).toEqual(defaultValue);
      expect(analyzeEPS({ historicalEps: [] })).toEqual(defaultValue);
      expect(analyzeEPS({ eps: 'invalid' })).toEqual(defaultValue);
    });
  });

  // ---------------------------------------------------------------------------
  // Debt Ratio Tests
  // ---------------------------------------------------------------------------
  describe('analyzeDebtRatio', () => {
    test('evaluates pre-calculated debt ratio (decimal or percentage) correctly', () => {
      expect(analyzeDebtRatio({ debtRatio: 0.45 })).toEqual({ value: 0.45, status: 'Healthy' });
      expect(analyzeDebtRatio({ debtRatio: 0.60 })).toEqual({ value: 0.60, status: 'Moderate' });
      expect(analyzeDebtRatio({ debtRatio: 0.75 })).toEqual({ value: 0.75, status: 'High Risk' });

      // Percentage formats normalized to decimals
      expect(analyzeDebtRatio({ debtRatio: 45 })).toEqual({ value: 0.45, status: 'Healthy' });
      expect(analyzeDebtRatio({ debtRatio: 75 })).toEqual({ value: 0.75, status: 'High Risk' });
    });

    test('calculates debt ratio dynamically from liabilities and assets', () => {
      expect(analyzeDebtRatio({ totalLiabilities: 4000, totalAssets: 10000 })).toEqual({ value: 0.4, status: 'Healthy' });
      expect(analyzeDebtRatio({ totalLiabilities: 6500, totalAssets: 10000 })).toEqual({ value: 0.65, status: 'Moderate' });
      expect(analyzeDebtRatio({ totalLiabilities: 8000, totalAssets: 10000 })).toEqual({ value: 0.8, status: 'High Risk' });
    });

    test('handles missing or invalid inputs gracefully', () => {
      const defaultValue = { value: null, status: 'N/A' };
      expect(analyzeDebtRatio(null)).toEqual(defaultValue);
      expect(analyzeDebtRatio(undefined)).toEqual(defaultValue);
      expect(analyzeDebtRatio({})).toEqual(defaultValue);
      expect(analyzeDebtRatio({ totalAssets: 0 })).toEqual(defaultValue);
      expect(analyzeDebtRatio({ totalLiabilities: 5000 })).toEqual(defaultValue);
      expect(analyzeDebtRatio({ debtRatio: 'invalid' })).toEqual(defaultValue);
    });
  });

  // ---------------------------------------------------------------------------
  // Revenue Growth Tests
  // ---------------------------------------------------------------------------
  describe('analyzeRevenueGrowth', () => {
    test('evaluates pre-calculated revenue growth rate correctly', () => {
      expect(analyzeRevenueGrowth({ revenueGrowth: 0.15 })).toEqual({ value: 0.15, status: 'High Growth' });
      expect(analyzeRevenueGrowth({ revenueGrowth: 0.05 })).toEqual({ value: 0.05, status: 'Stable Growth' });
      expect(analyzeRevenueGrowth({ revenueGrowth: -0.02 })).toEqual({ value: -0.02, status: 'Declining' });

      // Percentage format normalized
      expect(analyzeRevenueGrowth({ revenueGrowth: 15 })).toEqual({ value: 0.15, status: 'High Growth' });
      expect(analyzeRevenueGrowth({ revenueGrowth: -5 })).toEqual({ value: -0.05, status: 'Declining' });
    });

    test('calculates revenue growth dynamically from historical revenues', () => {
      // (1150 - 1000) / 1000 = 0.15
      expect(analyzeRevenueGrowth({ historicalRevenue: [800, 1000, 1150] })).toEqual({ value: 0.15, status: 'High Growth' });
      // (980 - 1000) / 1000 = -0.02
      expect(analyzeRevenueGrowth({ historicalRevenue: [1000, 980] })).toEqual({ value: -0.02, status: 'Declining' });
    });

    test('handles missing or invalid inputs gracefully', () => {
      const defaultValue = { value: null, status: 'N/A' };
      expect(analyzeRevenueGrowth(null)).toEqual(defaultValue);
      expect(analyzeRevenueGrowth(undefined)).toEqual(defaultValue);
      expect(analyzeRevenueGrowth({})).toEqual(defaultValue);
      expect(analyzeRevenueGrowth({ historicalRevenue: [1000] })).toEqual(defaultValue);
      expect(analyzeRevenueGrowth({ historicalRevenue: [] })).toEqual(defaultValue);
      expect(analyzeRevenueGrowth({ revenueGrowth: 'invalid' })).toEqual(defaultValue);
    });
  });

  // ---------------------------------------------------------------------------
  // Cash Flow Tests
  // ---------------------------------------------------------------------------
  describe('analyzeCashFlow', () => {
    test('evaluates direct cash flow values correctly', () => {
      expect(analyzeCashFlow({ freeCashFlow: 1000, operatingCashFlow: 1500 })).toEqual({
        freeCashFlow: 1000,
        operatingCashFlow: 1500,
        status: 'Strong'
      });

      expect(analyzeCashFlow({ freeCashFlow: -200, operatingCashFlow: 800 })).toEqual({
        freeCashFlow: -200,
        operatingCashFlow: 800,
        status: 'Moderate'
      });

      expect(analyzeCashFlow({ freeCashFlow: -500, operatingCashFlow: -100 })).toEqual({
        freeCashFlow: -500,
        operatingCashFlow: -100,
        status: 'Weak'
      });
    });

    test('calculates free cash flow dynamically if CapEx is provided', () => {
      // FCF = 1500 - 500 = 1000
      expect(analyzeCashFlow({ operatingCashFlow: 1500, capitalExpenditures: 500 })).toEqual({
        freeCashFlow: 1000,
        operatingCashFlow: 1500,
        status: 'Strong'
      });

      // FCF = 800 - 1000 = -200
      expect(analyzeCashFlow({ operatingCashFlow: 800, capitalExpenditures: 1000 })).toEqual({
        freeCashFlow: -200,
        operatingCashFlow: 800,
        status: 'Moderate'
      });
    });

    test('handles missing or invalid inputs gracefully', () => {
      const defaultValue = { freeCashFlow: null, operatingCashFlow: null, status: 'N/A' };
      expect(analyzeCashFlow(null)).toEqual(defaultValue);
      expect(analyzeCashFlow(undefined)).toEqual(defaultValue);
      expect(analyzeCashFlow({})).toEqual(defaultValue);
      expect(analyzeCashFlow({ capitalExpenditures: 500 })).toEqual(defaultValue);
      expect(analyzeCashFlow({ freeCashFlow: 'invalid' })).toEqual(defaultValue);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------
  describe('performFundamentalAnalysis (Integration)', () => {
    test('performs complete fundamental analysis with all metrics', () => {
      const stockData = {
        peRatio: 12.5,
        historicalEps: [1.0, 1.5, 2.0],
        totalLiabilities: 4000,
        totalAssets: 10000,
        historicalRevenue: [800, 1000, 1150],
        operatingCashFlow: 1500,
        capitalExpenditures: 500
      };

      const result = performFundamentalAnalysis(stockData);

      expect(result).toHaveProperty('pe');
      expect(result).toHaveProperty('eps');
      expect(result).toHaveProperty('debtRatio');
      expect(result).toHaveProperty('revenueGrowth');
      expect(result).toHaveProperty('cashFlow');

      expect(result.pe.status).toBe('Undervalued');
      expect(result.eps.trend).toBe('Growing');
      expect(result.debtRatio.status).toBe('Healthy');
      expect(result.revenueGrowth.status).toBe('High Growth');
      expect(result.cashFlow.status).toBe('Strong');
    });

    test('gracefully degradation with empty stock data', () => {
      const result = performFundamentalAnalysis({});
      expect(result.pe.status).toBe('N/A');
      expect(result.eps.status).toBe('N/A');
      expect(result.debtRatio.status).toBe('N/A');
      expect(result.revenueGrowth.status).toBe('N/A');
      expect(result.cashFlow.status).toBe('N/A');
    });
  });
});
