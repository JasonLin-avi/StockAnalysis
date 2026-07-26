import { generateReport }  from '../../src/lib/report-generator';

describe('Report Generator Module', () => {
  const mockAnalysisData = {
    symbol: 'AAPL',
    price: 150.25,
    changePercent: 1.18,
    date: '2026-07-12',
    technical: {
      ma: [145.2, 146.5, 148.1],
      rsi: [45.2, 50.1, 55.4],
      macd: {
        histogram: [0.01, 0.03, 0.05]
      }
    },
    fundamental: {
      pe: { value: 24.2, status: 'Fair', recommendation: 'Hold' },
      eps: { value: 6.2, trend: 'Growing', status: 'Strong' },
      debtRatio: { value: 0.45, status: 'Healthy' },
      revenueGrowth: { value: 0.12, status: 'High Growth' },
      cashFlow: { freeCashFlow: 12000000000, operatingCashFlow: 15000000000, status: 'Strong' }
    },
    news: {
      financialNews: { score: 0.25, sentiment: 'Positive' },
      socialSentiment: { score: 0.4, sentiment: 'Positive' },
      majorEvents: { hasHighImpactEvent: true, events: ['Product Launch'] }
    },
    advice: {
      buySell: { action: 'Buy', confidenceScore: 0.8, summary: 'Bullish outlook' },
      portfolio: { targetWeight: 0.08, allocationClass: 'Overweight', rationale: 'Strong core holding' },
      risk: { riskLevel: 'Low', riskMitigation: 'None needed', riskFactors: ['High competition'] }
    }
  };

  test('should generate HTML report successfully with full data', async () => {
    const report = await generateReport(mockAnalysisData, 'html');
    expect(report).toContain('<!DOCTYPE html>');
    expect(report).toContain('AAPL 分析報告');
    expect(report).toContain('報告日期: 2026-07-12');
    expect(report).toContain('$150.25');
    expect(report).toContain('badge-buy');
    expect(report).toContain('Buy');
    expect(report).toContain('8.0%');
    expect(report).toContain('High competition');
  });

  test('should handle missing fields gracefully and output defaults', async () => {
    const minimalData = {
      symbol: 'TSLA'
    };
    const report = await generateReport(minimalData, 'html');
    expect(report).toContain('TSLA 分析報告');
    expect(report).toContain('N/A');
    expect(report).toContain('badge-hold');
  });

  test('should reject unsupported formats', async () => {
    await expect(generateReport(mockAnalysisData, 'pdf')).rejects.toThrow('Unsupported report format');
  });

  test('should throw error if analysis data is null or undefined', async () => {
    await expect(generateReport(null)).rejects.toThrow();
  });
});
