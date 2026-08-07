// Why: Unit tests for the backtest API endpoints (/api/backtest/presets, predict, evaluate).
// Verifies HTTP GET and POST response structure, status codes, and input validation.

import { GET as getPresets } from '../../src/app/api/backtest/presets/route';
import { POST as predictPost } from '../../src/app/api/backtest/predict/route';
import { POST as evaluatePost } from '../../src/app/api/backtest/evaluate/route';
import { PRESET_CASES } from '../../src/services/backtest.service';

describe('Backtest API Routes', () => {
  describe('GET /api/backtest/presets', () => {
    it('returns preset cases list with 200 status code', async () => {
      // Why: The presets endpoint allows frontend users to pick preset backtest scenarios.
      const res = await getPresets();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.presets)).toBe(true);
      expect(data.presets.length).toEqual(PRESET_CASES.length);
      expect(data.presets[0]).toHaveProperty('id');
      expect(data.presets[0]).toHaveProperty('symbol');
      expect(data.presets[0]).toHaveProperty('cutoffDate');
    });
  });

  describe('POST /api/backtest/predict', () => {
    it('returns prediction report when symbol and cutoffDate are provided', async () => {
      // Why: The predict endpoint receives a stock symbol and cutoff date to trigger historical LLM analysis.
      const req = new Request('http://localhost/api/backtest/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: '2330.TW', cutoffDate: '2024-03-01' }),
      });

      const res = await predictPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.symbol).toBe('2330.TW');
      expect(data.cutoffDate).toBe('2024-03-01');
      expect(data.forecast).toBeDefined();
      expect(data.forecast).toHaveProperty('trend');
      expect(data.forecast).toHaveProperty('confidence');
      expect(data.forecast).toHaveProperty('targetPriceRange');
      expect(data.forecast).toHaveProperty('stopLossPrice');
      expect(data.forecast).toHaveProperty('rationale');
    });

    it('accepts custom lookbackDays and predictionDays parameters in payload', async () => {
      // Why: Validates dynamic lookbackDays and predictionDays payload support for point-in-time prediction.
      const req = new Request('http://localhost/api/backtest/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: '2330.TW',
          cutoffDate: '2024-03-01',
          lookbackDays: 60,
          predictionDays: 20,
        }),
      });

      const res = await predictPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.symbol).toBe('2330.TW');
      expect(data.cutoffDate).toBe('2024-03-01');
      expect(data.forecast).toBeDefined();
      expect(data.forecast).toHaveProperty('trend');
    });

    it('returns 400 error when symbol or cutoffDate is missing', async () => {
      // Why: Guard against invalid API calls with missing mandatory fields.
      const req = new Request('http://localhost/api/backtest/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: '2330.TW' }), // missing cutoffDate
      });

      const res = await predictPost(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required parameters');
    });
  });

  describe('POST /api/backtest/evaluate', () => {
    it('returns evaluation report comparing forecast with future kline outcome', async () => {
      // Why: The evaluate endpoint calculates prediction accuracy and generates an LLM summary.
      const req = new Request('http://localhost/api/backtest/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: '2330.TW',
          cutoffDate: '2024-03-01',
          predictionDays: 20,
          predictionResult: { trend: 'BULLISH', targetPriceRange: [900, 950] },
        }),
      });

      const res = await evaluatePost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.evaluation).toBeDefined();
      expect(data.evaluation).toHaveProperty('accuracyScore');
      expect(data.evaluation).toHaveProperty('directionCorrect');
      expect(data.evaluation).toHaveProperty('priceRangeHit');
      expect(data.evaluation).toHaveProperty('actualReturnPct');
      expect(data.evaluation).toHaveProperty('evaluationSummary');
    });
  });
});
