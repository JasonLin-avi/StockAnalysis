import { createDeepAgent }  from 'deepagents';
import { ChatOpenAI }  from '@langchain/openai';
import { SystemMessage } from '@langchain/core/messages';
import {
  getTechnicalIndicatorsTool,
  getFundamentalMetricsTool,
  getNewsSentimentTool,
  getInvestmentAdviceTool,
} from './tools.js';
import logger  from '../../lib/logger.js';

// Why: Initialize primary model from configuration (defaults to nvidia/nemotron-3.5-lightning-30b-a3b for fast tool-calling).
const primaryModelName = process.env.NV_MODEL_NAME || 'nvidia/nemotron-3.5-lightning-30b-a3b';
// Why: Fallback model ensures seamless continuity if the primary model encounters rate-limits or downtime.
const fallbackModelName = process.env.NV_FALLBACK_MODEL_NAME || 'z-ai/glm-5.3-flash';

const primaryModel = new ChatOpenAI({
  apiKey: process.env.NV_MINMAX_KEY || 'dummy_key',
  configuration: {
    baseURL: process.env.NV_API_URL || 'https://integrate.api.nvidia.com/v1',
  },
  modelName: primaryModelName,
  temperature: 0.2,
  maxRetries: 1,
  timeout: 30000,
});

const fallbackModel = new ChatOpenAI({
  apiKey: process.env.NV_MINMAX_KEY || 'dummy_key',
  configuration: {
    baseURL: process.env.NV_API_URL || 'https://integrate.api.nvidia.com/v1',
  },
  modelName: fallbackModelName,
  temperature: 0.2,
  maxRetries: 1,
  timeout: 30000,
});

const agentTools = [
  getTechnicalIndicatorsTool,
  getFundamentalMetricsTool,
  getNewsSentimentTool,
  getInvestmentAdviceTool,
];

const systemPrompt = `你是一位專業的 AI 投資顧問助理。
你的任務是利用工具庫中的工具，查詢股票的技術指標、財報指標、新聞輿情與投資評級，為用戶解答疑問並提供精闢的解釋。
請優先使用工具查詢數據，切勿憑空捏造不存在的股票數值或建議。請以繁體中文直接回答，切勿輸出內部思考過程。`;

// Why: deepagents internally expects model to directly implement .bindTools(tools).
// Therefore, we compile two independent agents and orchestrate failover at the agent execution level.
const primaryAgent = createDeepAgent({
  model: primaryModel,
  tools: agentTools,
  systemPrompt,
});

const fallbackAgent = createDeepAgent({
  model: fallbackModel,
  tools: agentTools,
  systemPrompt,
});

logger.info('DEEP_AGENT', `Initialized DeepAgent with primary: ${primaryModelName}, fallback: ${fallbackModelName}`);

// Why: Provide a single financialAdvisorAgent interface whose invoke() method transparently falls back to the secondary agent if the primary encounters errors or downtime.
// Also dynamically injects the active stock ticker context from config so the LLM calls tools with the real symbol instead of placeholder strings.
const financialAdvisorAgent = {
  async invoke(input, config) {
    let currentTicker = config?.configurable?.currentTicker;
    if (typeof currentTicker === 'string' && /^\d{4,6}$/.test(currentTicker.trim())) {
      currentTicker = `${currentTicker.trim().toUpperCase()}.TW`;
    }
    let finalInput = input;

    if (currentTicker && currentTicker !== 'Stock' && currentTicker !== 'N/A') {
      const messages = Array.isArray(input?.messages) ? [...input.messages] : [];
      const tickerInstruction = `當前用戶正在觀看股票代碼：${currentTicker}。若用戶詢問「這檔股票」、「這家公司」或未明確指明代碼時，請使用完整代碼 ${currentTicker}（台股請務必帶有 .TW，例如 ${currentTicker}）呼叫工具查詢數據。切勿使用 {currentTicker} 作為代碼。`;

      const existingSystemIndex = messages.findIndex(m => {
        const type = typeof m._getType === 'function' ? m._getType() : (m.type || m._type);
        return type === 'system';
      });

      if (existingSystemIndex >= 0) {
        const existingContent = messages[existingSystemIndex].content || '';
        const updatedContent = existingContent.includes('{currentTicker}')
          ? existingContent.replace(/\{currentTicker\}/g, currentTicker)
          : `${existingContent}\n${tickerInstruction}`;
        messages[existingSystemIndex] = new SystemMessage(updatedContent);
      } else {
        messages.unshift(new SystemMessage(tickerInstruction));
      }
      finalInput = { ...input, messages };
    }

    try {
      return await primaryAgent.invoke(finalInput, config);
    } catch (err) {
      logger.warn('DEEP_AGENT', `Primary model (${primaryModelName}) execution failed, switching to fallback model (${fallbackModelName}): ${err.message}`);
      return await fallbackAgent.invoke(finalInput, config);
    }
  },
};

export { financialAdvisorAgent };
