const {
  getTechnicalIndicatorsTool,
  getFundamentalMetricsTool,
  getNewsSentimentTool,
  getInvestmentAdviceTool
} = require('../../src/lib/chatbot/tools');
const { financialAdvisorAgent } = require('../../src/lib/chatbot/deep-agent');
const integration = require('../../src/lib/integration');

jest.mock('../../src/lib/integration', () => ({
  performFullAnalysis: jest.fn()
}));

describe('Chatbot Agent & Tools', () => {
  afterEach(() => {
    jest.clearAllMocks();
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
});

