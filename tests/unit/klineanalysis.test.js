const { generateLLMTechnicalSummary } = require('../../src/lib/technical-analysis/klineanalysis');

describe('generateLLMTechnicalSummary', () => {
  const createMockData = (count = 40) => ({
    dates: Array.from({ length: count }, (_, i) => `2026-06-${(i + 1).toString().padStart(2, '0')}`),
    opens: Array.from({ length: count }, (_, i) => 100 + i),
    highs: Array.from({ length: count }, (_, i) => 105 + i),
    lows: Array.from({ length: count }, (_, i) => 95 + i),
    closes: Array.from({ length: count }, (_, i) => 102 + i),
    volumes: Array.from({ length: count }, () => 50000)
  });

  test('should throw error when data length is less than 30', () => {
    const shortData = createMockData(20);
    expect(() => generateLLMTechnicalSummary(shortData)).toThrow('數據量不足，至少需要 30 筆資料來計算指標。');
  });

  test('should generate structured LLM technical summary correctly', () => {
    const rawData = createMockData(40);
    const summary = generateLLMTechnicalSummary(rawData);

    expect(summary).toBeDefined();
    expect(summary.date).toBe('2026-06-40');
    
    // Check price_action fields
    expect(summary.price_action).toHaveProperty('current_close');
    expect(summary.price_action).toHaveProperty('change_from_prev');
    expect(summary.price_action).toHaveProperty('change_pct');
    expect(summary.price_action).toHaveProperty('support_level_20d');
    expect(summary.price_action).toHaveProperty('resistance_level_20d');

    // Check technical_indicators fields
    expect(summary.technical_indicators).toHaveProperty('MA5');
    expect(summary.technical_indicators).toHaveProperty('MA20');
    expect(summary.technical_indicators).toHaveProperty('trend_short_term');
    expect(summary.technical_indicators).toHaveProperty('RSI_14');
    expect(summary.technical_indicators).toHaveProperty('MACD_status');

    // Check volume_analysis fields
    expect(summary.volume_analysis).toHaveProperty('current_volume');
    expect(summary.volume_analysis).toHaveProperty('volume_vs_5d_avg');

    expect(typeof summary.technical_indicators.MA5).toBe('number');
    expect(typeof summary.technical_indicators.RSI_14).toBe('number');
    expect(typeof summary.technical_indicators.trend_short_term).toBe('string');
  });

  test('should detect volume surge correctly when volume > 1.5x 5-day average', () => {
    const rawData = createMockData(40);
    // Surge latest volume
    rawData.volumes[39] = 200000;
    const summary = generateLLMTechnicalSummary(rawData);

    expect(summary.volume_analysis.volume_vs_5d_avg).toBe('爆量');
  });
});
