/**
 * Unit tests for the Investment Advisor Module.
 * Validates portfolio weights, buy/sell recommendations, and risk management assessments.
 */

const {
  generateInvestmentAdvice,
  generatePortfolioAdvice,
  generateBuySellAdvice,
  generateRiskManagementAdvice
} = require('../../src/lib/investment-advisor/index');

describe('Investment Advisor Engine', () => {

  // Test dataset setup
  const mockStrongStock = {
    price: 150,
    technical: {
      rsi: [25], // Oversold, bullish buy catalyst
      ma: [140],  // Price is above MA (bullish trend)
      macd: { histogram: [1.2] } // Bullish momentum
    },
    fundamental: {
      pe: { status: 'Undervalued' },
      eps: { status: 'Strong' },
      debtRatio: { status: 'Healthy' },
      revenueGrowth: { status: 'High Growth' },
      cashFlow: { status: 'Strong' }
    },
    news: {
      financialNews: { score: 0.8 },
      socialSentiment: { score: 0.7 },
      majorEvents: { hasHighImpactEvent: false }
    }
  };

  const mockWeakStock = {
    price: 90,
    technical: {
      rsi: [75], // Overbought, bearish selling pressure
      ma: [110], // Price is below MA (bearish trend)
      macd: { histogram: [-0.8] } // Bearish momentum
    },
    fundamental: {
      pe: { status: 'N/A (Loss)' },
      eps: { status: 'Weak' },
      debtRatio: { status: 'High Risk' },
      revenueGrowth: { status: 'Declining' },
      cashFlow: { status: 'Weak' }
    },
    news: {
      financialNews: { score: -0.6 },
      socialSentiment: { score: -0.7 },
      majorEvents: { hasHighImpactEvent: true } // High-impact event risk
    }
  };

  const mockNeutralStock = {
    price: 95, // Price below MA (95 < 100) to represent bearish/neutral trend
    technical: {
      rsi: [50],
      ma: [100],
      macd: { histogram: [-0.1] } // Negative MACD histogram for neutral/bearish momentum
    },
    fundamental: {
      pe: { status: 'Fair' },
      eps: { status: 'Moderate' },
      debtRatio: { status: 'Moderate' },
      revenueGrowth: { status: 'Stable Growth' },
      cashFlow: { status: 'Moderate' }
    },
    news: {
      financialNews: { score: 0 },
      socialSentiment: { score: 0 },
      majorEvents: { hasHighImpactEvent: false }
    }
  };

  // ---------------------------------------------------------------------------
  // Portfolio Advice Tests
  // ---------------------------------------------------------------------------
  describe('generatePortfolioAdvice', () => {
    test('recommends Overweight for solid stocks with strong sentiment', () => {
      const result = generatePortfolioAdvice(mockStrongStock);
      expect(result.allocationClass).toBe('Overweight');
      expect(result.targetWeight).toBe(0.12);
      expect(result.rationale).toContain('Suitable for overweighting');
    });

    test('recommends Avoid for high leverage stocks', () => {
      const result = generatePortfolioAdvice(mockWeakStock);
      expect(result.allocationClass).toBe('Avoid');
      expect(result.targetWeight).toBe(0.0);
    });

    test('recommends Equal Weight for standard holdings', () => {
      const result = generatePortfolioAdvice(mockNeutralStock);
      expect(result.allocationClass).toBe('Equal Weight');
      expect(result.targetWeight).toBe(0.08); // Grade health >= 3
    });

    test('handles empty data gracefully', () => {
      const result = generatePortfolioAdvice({});
      expect(result.targetWeight).toBe(0);
      expect(result.allocationClass).toBe('Under Review');
    });

    test('returns correct health score and fundamental breakdown', () => {
      // We check if healthScore and breakdown objects exist and verify score breakdown
      // for the PE metric specifically, to confirm the details are correctly propagated
      // from the grading logic.
      const result = generatePortfolioAdvice(mockStrongStock);
      expect(result).toHaveProperty('healthScore');
      expect(result).toHaveProperty('breakdown');
      expect(result.healthScore).toBe(10); // All 5 mock fundamentals are healthy
      expect(result.breakdown.pe.score).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Buy/Sell Recommendation Tests
  // ---------------------------------------------------------------------------
  describe('generateBuySellAdvice', () => {
    test('triggers Buy recommendation for high-scoring stock', () => {
      const result = generateBuySellAdvice(mockStrongStock);
      expect(result.action).toBe('Buy');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.70);
      expect(result.summary).toContain('Strong fundamentals');
    });

    test('triggers Sell recommendation for low-scoring stock', () => {
      const result = generateBuySellAdvice(mockWeakStock);
      expect(result.action).toBe('Sell');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.70);
    });

    test('triggers Hold recommendation for neutral stock', () => {
      const result = generateBuySellAdvice(mockNeutralStock);
      expect(result.action).toBe('Hold');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.50);
    });

    test('handles empty inputs gracefully', () => {
      const result = generateBuySellAdvice(null);
      expect(result.action).toBe('Hold');
      expect(result.confidenceScore).toBe(0.5);
    });

    test('returns correct breakdown details and total score', () => {
      // Validate that the output contains the aggregated totalScore and a detailed breakdown
      // structure, which stores individual indicator values and scores to allow upstream
      // clients to show granular metric analysis.
      const result = generateBuySellAdvice(mockStrongStock);
      expect(result).toHaveProperty('totalScore');
      expect(result).toHaveProperty('breakdown');
      expect(result.breakdown.technical.rsi.value).toBe(25);
      expect(result.breakdown.technical.rsi.score).toBe(10);
      expect(result.breakdown.fundamental.pe.status).toBe('Undervalued');
      expect(result.breakdown.fundamental.pe.score).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // Risk Management Tests
  // ---------------------------------------------------------------------------
  describe('generateRiskManagementAdvice', () => {
    test('reports Low risk for strong stocks', () => {
      const result = generateRiskManagementAdvice(mockStrongStock);
      expect(result.riskLevel).toBe('Low');
      expect(result.riskFactors[0]).toBe('No major structural risk factors detected');
    });

    test('reports Critical risk for stocks with multiple structural failures', () => {
      const result = generateRiskManagementAdvice(mockWeakStock);
      // Weak stock contains: high debt, negative cash flow, unprofitable (neg PE), high impact event
      expect(result.riskLevel).toBe('Critical');
      expect(result.riskFactors.length).toBeGreaterThanOrEqual(3);
      expect(result.riskMitigation).toContain('exiting positions');
    });

    test('reports Medium risk for stocks with single risk factor', () => {
      // Create stock with only one risk factor: High Leverage
      const singleRiskStock = {
        fundamental: {
          debtRatio: { status: 'High Risk' },
          pe: { status: 'Fair' }
        }
      };
      const result = generateRiskManagementAdvice(singleRiskStock);
      expect(result.riskLevel).toBe('Medium');
      expect(result.riskFactors).toContain('High Financial Leverage (Debt Ratio > 70%)');
    });

    test('handles empty input gracefully', () => {
      const result = generateRiskManagementAdvice(null);
      expect(result.riskLevel).toBe('Medium');
      expect(result.riskFactors.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------
  describe('generateInvestmentAdvice (Integration)', () => {
    test('packages portfolio, buy/sell, and risk advice together', () => {
      const result = generateInvestmentAdvice(mockStrongStock);
      expect(result).toHaveProperty('portfolio');
      expect(result).toHaveProperty('buySell');
      expect(result).toHaveProperty('risk');

      expect(result.portfolio.allocationClass).toBe('Overweight');
      expect(result.buySell.action).toBe('Buy');
      expect(result.risk.riskLevel).toBe('Low');
    });
  });
});
