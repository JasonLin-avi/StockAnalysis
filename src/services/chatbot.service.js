// src/services/chatbot.service.js
// Why: Chatbot service layer encapsulating LLM processing logic and LangChain message normalization.
// Decouples HTTP request/response parsing from AI agent graph invocation.

import { financialAdvisorAgent }  from '../lib/chatbot/deep-agent';
import { HumanMessage, AIMessage, SystemMessage }  from '@langchain/core/messages';
import logger  from '../lib/logger';

/**
 * Normalizes input messages, invokes the financial advisor AI agent, and filters/serializes the response.
 * Why: Encapsulates agent state handling and data structure conversion from API route domain.
 * 
 * @param {Array<Object>} messages - Raw input messages with role/content.
 * @param {string} ticker - Stock ticker context.
 * @returns {Promise<Array<Object>>} Serialized messages history.
 */
async function handleChatResponse(messages, ticker) {
  // Why: Ensure the messages argument is an array to prevent mapping errors.
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array');
  }

  // Why: Map the custom JSON message objects to LangChain message classes required by the state graph.
  const formattedMessages = messages.map(msg => {
    if (msg.role === 'user') return new HumanMessage(msg.content);
    if (msg.role === 'system') return new SystemMessage(msg.content);
    return new AIMessage(msg.content);
  });

  logger.info('CHATBOT_SERVICE', `Invoking financial advisor agent for ticker ${ticker}...`);
  
  // Why: Invoke the financial advisor state graph using the formatted messages and supply the ticker context.
  const response = await financialAdvisorAgent.invoke(
    { messages: formattedMessages },
    { configurable: { currentTicker: ticker } }
  );

  // Why: Serialize the resulting LangChain Message instances back to a simple role/content JSON structure.
  // We filter out 'tool' messages and empty 'ai' messages (which represent tool calls) so raw payloads don't appear in the UI.
  const serializableMessages = response.messages
    .filter(msg => {
      const type = typeof msg._getType === 'function' ? msg._getType() : (msg.type || msg._type || '');
      return type !== 'tool' && !(type === 'ai' && !msg.content);
    })
    .map(msg => {
      const type = typeof msg._getType === 'function' ? msg._getType() : (msg.type || msg._type || '');
      let role = 'assistant';
      if (type === 'human') role = 'user';
      if (type === 'system') role = 'system';
      return {
        role,
        content: msg.content
      };
    });

  return serializableMessages;
}

export {handleChatResponse};

// Why: The chat API route uses `import chatbotService from '...'` (default import)
// and calls `chatbotService.handleChatResponse(...)`. Provide default export to match.
export default { handleChatResponse };
