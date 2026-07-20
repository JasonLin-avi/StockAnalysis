const { generateLLMTechnicalSummary } = require('../../src/lib/technical-analysis/klineanalysis');

describe('generateLLMTechnicalSummary (with Long-Term Analysis Support)', () => {
  const createMockData = (count = 80, trend = 'up') => ({
    dates: Array.from({ length: count }, (_, i) => `2026-06-${(i + 1).toString().padStart(2, '0')}`),
    opens: Array.from({ length: count }, (_, i) => trend === 'up' ? 100 + i : 500 - i),
    highs: Array.from({ length: count }, (_, i) => trend === 'up' ? 105 + i : 505 - i),
    lows: Array.from({ length: count }, (_, i) => trend === 'up' ? 95 + i : 495 - i),
    closes: Array.from({ length: count }, (_, i) => trend === 'up' ? 102 + i : 498 - i),
    volumes: Array.from({ length: count }, () => 50000)
  });

  test('should throw error when data length is less than 60', () => {
    const shortData = createMockData(45);
    expect(() => generateLLMTechnicalSummary(shortData)).toThrow('數據量不足，至少需要 60 筆資料來計算長短線指標。');
  });

  test('should generate structured LLM summary with long-term indicators (MA60, 60d levels)', () => {
    const rawData = createMockData(80, 'up');
    const summary = generateLLMTechnicalSummary(rawData);

    expect(summary).toBeDefined();
    expect(summary.date).toBe('2026-06-80');
    
    // Check price_action fields including 60-day levels
    expect(summary.price_action).toHaveProperty('current_close');
    expect(summary.price_action).toHaveProperty('support_level_20d');
    expect(summary.price_action).toHaveProperty('resistance_level_20d');
    expect(summary.price_action).toHaveProperty('support_level_60d');
    expect(summary.price_action).toHaveProperty('resistance_level_60d');

    // Check technical_indicators fields including MA60 and long-term trend
    expect(summary.technical_indicators).toHaveProperty('MA5');
    expect(summary.technical_indicators).toHaveProperty('MA20');
    expect(summary.technical_indicators).toHaveProperty('MA60');
    expect(summary.technical_indicators).toHaveProperty('trend_short_term');
    expect(summary.technical_indicators).toHaveProperty('trend_long_term');

    expect(typeof summary.technical_indicators.MA60).toBe('number');
    expect(typeof summary.technical_indicators.trend_long_term).toBe('string');
  });

  test('should detect long-term bullish trend correctly when price > MA60 and MA60 is rising', () => {
    const rawData = createMockData(80, 'up');
    const summary = generateLLMTechnicalSummary(rawData);

    expect(summary.technical_indicators.trend_long_term).toContain('長線多頭結構');
  });

  test('should detect long-term bearish trend correctly when price < MA60 and MA60 is falling', () => {
    const rawData = createMockData(80, 'down');
    const summary = generateLLMTechnicalSummary(rawData);

    expect(summary.technical_indicators.trend_long_term).toContain('長線空頭結構');
  });

  test('should detect volume surge correctly when volume > 1.5x 5-day average', () => {
    const rawData = createMockData(80, 'up');
    rawData.volumes[79] = 200000;
    const summary = generateLLMTechnicalSummary(rawData);

    expect(summary.volume_analysis.volume_vs_5d_avg).toBe('爆量');
  });
});
