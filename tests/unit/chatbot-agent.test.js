const {
  getTechnicalIndicatorsTool,
  getFundamentalMetricsTool,
  getNewsSentimentTool,
  getInvestmentAdviceTool,
  clearCache,
  getCachedAnalysis
} = require('../../src/lib/chatbot/tools');
import { financialAdvisorAgent }  from '../../src/lib/chatbot/deep-agent';
import integration  from '../../src/lib/integration';

jest.mock('../../src/lib/integration', () => ({
  performFullAnalysis: jest.fn()
}));

describe('Chatbot Agent & Tools', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    clearCache();
  });

  test('get_technical_indicators tool calls performFullAnalysis and returns JSON data', async () => {
    integration.performFullAnalysis.mockResolvedValue({
      symbol: 'AAPL',
      price: 150.0,
      technical: { rsi: 65.4, macd: { histogram: [0.1] }, ma: [148.0] }
    });

    const toolInput = { symbol: 'AAPL' };
    const resultStr = await getTechnicalIndicatorsTool.invoke(toolInput);
    const result = JSON.parse(resultStr);

    expect(integration.performFullAnalysis).toHaveBeenCalledWith('AAPL');
    expect(result.symbol).toBe('AAPL');
    expect(result.price).toBe(150.0);
    expect(result.technical.rsi).toBe(65.4);
  });

  test('get_fundamental_metrics tool calls performFullAnalysis and returns JSON data', async () => {
    integration.performFullAnalysis.mockResolvedValue({
      symbol: 'MSFT',
      price: 350.0,
      fundamental: { peRatio: 25.5, debtRatio: 1.2 }
    });

    const toolInput = { symbol: 'MSFT' };
    const resultStr = await getFundamentalMetricsTool.invoke(toolInput);
    const result = JSON.parse(resultStr);

    expect(integration.performFullAnalysis).toHaveBeenCalledWith('MSFT');
    expect(result.symbol).toBe('MSFT');
    expect(result.price).toBe(350.0);
    expect(result.fundamental.peRatio).toBe(25.5);
  });

  test('get_news_sentiment tool calls performFullAnalysis and returns JSON data', async () => {
    integration.performFullAnalysis.mockResolvedValue({
      symbol: 'GOOGL',
      news: { score: 0.75, sentiment: 'Bullish', articles: [] }
    });

    const toolInput = { symbol: 'GOOGL' };
    const resultStr = await getNewsSentimentTool.invoke(toolInput);
    const result = JSON.parse(resultStr);

    expect(integration.performFullAnalysis).toHaveBeenCalledWith('GOOGL');
    expect(result.symbol).toBe('GOOGL');
    expect(result.news.score).toBe(0.75);
    expect(result.news.sentiment).toBe('Bullish');
  });

  test('get_investment_advice tool calls performFullAnalysis and returns JSON data', async () => {
    integration.performFullAnalysis.mockResolvedValue({
      symbol: 'TSLA',
      advice: { recommendation: 'Buy', score: 85 }
    });

    const toolInput = { symbol: 'TSLA' };
    const resultStr = await getInvestmentAdviceTool.invoke(toolInput);
    const result = JSON.parse(resultStr);

    expect(integration.performFullAnalysis).toHaveBeenCalledWith('TSLA');
    expect(result.symbol).toBe('TSLA');
    expect(result.advice.recommendation).toBe('Buy');
    expect(result.advice.score).toBe(85);
  });

  test('financialAdvisorAgent compiles successfully and has invoke method', () => {
    expect(financialAdvisorAgent).toBeDefined();
    expect(typeof financialAdvisorAgent.invoke).toBe('function');
  });

  test('concurrency: two simultaneous calls to getCachedAnalysis only call performFullAnalysis once', async () => {
    integration.performFullAnalysis.mockImplementation(async () => {
      // Why: Introduce a slight delay to simulate an asynchronous network request.
      await new Promise(resolve => setTimeout(resolve, 50));
      return { symbol: 'AAPL', price: 150 };
    });

    const promise1 = getCachedAnalysis('AAPL');
    const promise2 = getCachedAnalysis('AAPL');

    const [res1, res2] = await Promise.all([promise1, promise2]);

    expect(integration.performFullAnalysis).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(res2);
    expect(res1.symbol).toBe('AAPL');
  });

  test('cache expiration: calls after 10 seconds re-trigger performFullAnalysis', async () => {
    integration.performFullAnalysis.mockResolvedValue({ symbol: 'AAPL', price: 150 });

    // Call once
    await getCachedAnalysis('AAPL');
    expect(integration.performFullAnalysis).toHaveBeenCalledTimes(1);

    // Call immediately (cached)
    await getCachedAnalysis('AAPL');
    expect(integration.performFullAnalysis).toHaveBeenCalledTimes(1);

    // Why: Mock the system time to simulate advancing 11 seconds.
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 11000);

    // Call again after 11 seconds (should trigger performFullAnalysis again)
    await getCachedAnalysis('AAPL');
    expect(integration.performFullAnalysis).toHaveBeenCalledTimes(2);

    // Why: Restore original Date.now.
    Date.now.mockRestore();
  });

  test('error handling: tool execution handles performFullAnalysis throwing errors gracefully', async () => {
    integration.performFullAnalysis.mockRejectedValue(new Error('API analysis failed'));

    const toolInput = { symbol: 'AAPL' };
    const resultStr = await getTechnicalIndicatorsTool.invoke(toolInput);
    const result = JSON.parse(resultStr);

    expect(result.error).toBe('API analysis failed');
  });

  test('cache clearing on rejection: when performFullAnalysis fails, the cache entry is immediately cleared', async () => {
    integration.performFullAnalysis
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce({ symbol: 'AAPL', price: 150 });

    // Why: First call should fail, throwing an error.
    await expect(getCachedAnalysis('AAPL')).rejects.toThrow('First failure');

    // Why: Second call should try again and succeed, demonstrating the failed promise was not cached.
    const res = await getCachedAnalysis('AAPL');
    expect(res.symbol).toBe('AAPL');
    expect(res.price).toBe(150);
    expect(integration.performFullAnalysis).toHaveBeenCalledTimes(2);
  });
});

