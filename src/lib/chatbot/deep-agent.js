import { createDeepAgent }  from 'deepagents';
import { ChatOpenAI }  from '@langchain/openai';
import {
  getTechnicalIndicatorsTool,
  getFundamentalMetricsTool,
  getNewsSentimentTool,
  getInvestmentAdviceTool,
} from './tools.js';

// Why: Initialize NVIDIA NIM compatible OpenAI wrapper using configuration from environment variables.
const minimaxModel = new ChatOpenAI({
  apiKey: process.env.NV_MINMAX_KEY || 'dummy_key',
  configuration: {
    baseURL: process.env.NV_API_URL || 'https://integrate.api.nvidia.com/v1',
  },
  modelName: process.env.NV_MODEL_NAME || 'minimaxai/minimax-m2.7',
  temperature: 0.2,
});

// Why: Compile the agent using deepagents runner with full accessibility tools bound for stock analysis lookups.
const financialAdvisorAgent = createDeepAgent({
  model: minimaxModel,
  tools: [
    getTechnicalIndicatorsTool,
    getFundamentalMetricsTool,
    getNewsSentimentTool,
    getInvestmentAdviceTool,
  ],
  systemPrompt: `你是一位專業的 AI 投資顧問助理。當前用戶正在觀看股票：{currentTicker}。
你的任務是利用工具庫中的工具，查詢該股票的技術指標、財報指標、新聞輿情與投資評級，為用戶解答疑問並提供精闢的解釋。
請優先使用工具查詢數據，切勿憑空捏造不存在的股票數值或建議。請以繁體中文回答。`,
});

export {financialAdvisorAgent};
