/**
 * @fileoverview Unit tests for centralized prompts
 * 
 * Verifies version constants, parameter formatting, and backward-compatible signatures.
 */

import {
  TECHNICAL_AI_PROMPT_VERSION,
  getTechnicalAIPrompt,
  FINANCIAL_TREND_PROMPT_VERSION,
  getFinancialTrendPrompt,
  FUNDS_FLOW_PROMPT_VERSION,
  getFundsFlowPrompt,
  BACKTEST_EVALUATE_PROMPT_VERSION,
  getBacktestEvaluatePrompt,
  BACKTEST_PREDICT_PROMPT_VERSION,
  getBacktestPredictPrompt
} from '../../src/lib/prompts';

describe('Prompts Centralization', () => {
  describe('technical-ai.prompt', () => {
    it('defines version string', () => {
      expect(TECHNICAL_AI_PROMPT_VERSION).toBe('1.0.0');
    });

    it('formats prompt with positional arguments', () => {
      const prompt = getTechnicalAIPrompt('台積電 (2330.TW)', '| Date | Close |', 30);
      expect(prompt).toContain('15 年經驗的資深量化交易員');
      expect(prompt).toContain('台積電 (2330.TW) (近 30 個交易日時間序列數據)');
      expect(prompt).toContain('| Date | Close |');
    });

    it('formats prompt with options object', () => {
      const prompt = getTechnicalAIPrompt({
        displayName: '聯發科 (2454.TW)',
        timeSeriesSummary: { markdownTable: '| Date | High | Low |' },
        days: 60
      });
      expect(prompt).toContain('聯發科 (2454.TW) (近 60 個交易日時間序列數據)');
      expect(prompt).toContain('| Date | High | Low |');
    });
  });

  describe('financial-trend.prompt', () => {
    it('defines version string', () => {
      expect(FINANCIAL_TREND_PROMPT_VERSION).toBe('1.0.0');
    });

    it('formats prompt with positional arguments and 5 dimensions', () => {
      const prompt = getFinancialTrendPrompt('鴻海 (2317.TW)', 5);
      expect(prompt).toContain('鴻海 (2317.TW) 過去 5 年的財務數據');
      expect(prompt).toContain('營收成長');
      expect(prompt).toContain('淨利趨勢');
      expect(prompt).toContain('自由現金流');
      expect(prompt).toContain('利潤率');
      expect(prompt).toContain('負債水準');
      expect(prompt).toContain('股東權益報酬率（ROE）');
    });

    it('formats prompt with options object', () => {
      const prompt = getFinancialTrendPrompt({
        displayName: '台積電 (2330.TW)',
        years: 3
      });
      expect(prompt).toContain('台積電 (2330.TW) 過去 3 年的財務數據');
    });
  });

  describe('funds-flow.prompt', () => {
    it('defines version string', () => {
      expect(FUNDS_FLOW_PROMPT_VERSION).toBe('1.0.0');
    });

    it('formats prompt for Taiwan market (TW)', () => {
      const prompt = getFundsFlowPrompt('TW', '2026-08-01');
      expect(prompt).toContain('台股');
      expect(prompt).toContain('2026-08-01 之前一個月內');
      expect(prompt).toContain('三大法人（若為台股）');
    });

    it('formats prompt for US market (US)', () => {
      const prompt = getFundsFlowPrompt('US', '2026-08-01');
      expect(prompt).toContain('美股');
      expect(prompt).toContain('2026-08-01 之前一個月內');
      expect(prompt).toContain('機構資金（若為美股）');
    });

    it('formats prompt with options object', () => {
      const prompt = getFundsFlowPrompt({ market: 'US', date: '2026-09-15' });
      expect(prompt).toContain('美股');
      expect(prompt).toContain('2026-09-15 之前一個月內');
    });
  });

  describe('backtest-evaluate.prompt', () => {
    it('defines version string', () => {
      expect(BACKTEST_EVALUATE_PROMPT_VERSION).toBe('1.0.0');
    });

    it('formats prompt with parameters', () => {
      const prompt = getBacktestEvaluatePrompt({
        symbol: '2330.TW',
        cutoffDate: '2024-03-01',
        futureDays: 20,
        predictionResult: {
          trend: 'BULLISH',
          stopLossPrice: 650,
          rationale: 'Breakout above MA20'
        },
        startPrice: 700,
        startDate: '2024-03-01',
        endPrice: 750,
        endDate: '2024-03-29',
        actualReturnPct: 7.14,
        directionCorrect: true,
        priceRangeHit: true,
        minTarget: 720,
        maxTarget: 760
      });

      expect(prompt).toContain('你是一位客觀嚴謹的金融裁判');
      expect(prompt).toContain('【2024-03-01】對 2330.TW 發布的預測');
      expect(prompt).toContain('未來 20 個交易日');
      expect(prompt).toContain('看法方向: BULLISH');
      expect(prompt).toContain('目標價區間: $720 - $760');
      expect(prompt).toContain('實際漲跌幅: 7.14%');
      expect(prompt).toContain('方向是否正確: 是');
    });
  });

  describe('backtest-predict.prompt', () => {
    it('defines version string', () => {
      expect(BACKTEST_PREDICT_PROMPT_VERSION).toBe('1.0.0');
    });

    it('formats prompt with quantitative parameters', () => {
      const prompt = getBacktestPredictPrompt({
        symbol: 'AAPL',
        cutoffDate: '2024-05-01',
        lastClose: 180,
        recentPastLength: 60,
        maxClose: 195,
        minClose: 165,
        avgClose: 178.5,
        markdownTable: '| 2024-05-01 | 180 |'
      });

      expect(prompt).toContain('15 年實戰經驗的資深量化交易員');
      expect(prompt).toContain('基準日期 (Cutoff Date): 2024-05-01');
      expect(prompt).toContain('股票代碼: AAPL');
      expect(prompt).toContain('基準日當天收盤價: $180');
      expect(prompt).toContain('| 2024-05-01 | 180 |');
    });
  });
});
