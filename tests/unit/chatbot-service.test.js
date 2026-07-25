// tests/unit/chatbot-service.test.js
// Why: Unit tests for Chatbot Service layer.
// Verifies message format adaptation, agent invocation, and response serialization logic.

const { handleChatResponse } = require('../../src/services/chatbot.service');
const { financialAdvisorAgent } = require('../../src/lib/chatbot/deep-agent');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');

jest.mock('../../src/lib/chatbot/deep-agent', () => ({
  financialAdvisorAgent: {
    invoke: jest.fn()
  }
}));

describe('Chatbot Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should format messages correctly, invoke agent graph, and serialize output', async () => {
    // Why: Mock the agent returning LangChain message objects of different types,
    // including user messages, AI messages, tool messages, and empty AI messages.
    financialAdvisorAgent.invoke.mockResolvedValue({
      messages: [
        new SystemMessage('System prompt context'),
        new HumanMessage('User question'),
        new AIMessage({ content: '', tool_calls: [{ name: 'get_tech', args: {} }] }), // empty tool call AI message
        { _getType: () => 'tool', content: 'tool output' }, // tool message
        new AIMessage('Final analysis reply')
      ]
    });

    const inputMessages = [
      { role: 'system', content: 'System prompt context' },
      { role: 'user', content: 'User question' }
    ];

    const result = await handleChatResponse(inputMessages, 'TSLA');

    // Why: Ensure the agent was invoked with correct structure and ticker configuration context.
    expect(financialAdvisorAgent.invoke).toHaveBeenCalledTimes(1);
    const invokeArgs = financialAdvisorAgent.invoke.mock.calls[0];
    expect(invokeArgs[0].messages).toHaveLength(2);
    expect(invokeArgs[0].messages[0]).toBeInstanceOf(SystemMessage);
    expect(invokeArgs[0].messages[1]).toBeInstanceOf(HumanMessage);
    expect(invokeArgs[1].configurable.currentTicker).toBe('TSLA');

    // Why: The service must strip out tool and empty AI messages, and return serialized plain objects.
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ role: 'system', content: 'System prompt context' });
    expect(result[1]).toEqual({ role: 'user', content: 'User question' });
    expect(result[2]).toEqual({ role: 'assistant', content: 'Final analysis reply' });
  });

  test('should propagate errors from the underlying agent graph', async () => {
    financialAdvisorAgent.invoke.mockRejectedValue(new Error('Agent failure'));

    await expect(handleChatResponse([], 'MSFT')).rejects.toThrow('Agent failure');
  });

  test('should reject invalid messages inputs (such as null, strings, or numbers)', async () => {
    // Why: Verify handleChatResponse rejects non-array inputs with precise error message.
    await expect(handleChatResponse(null, 'AAPL')).rejects.toThrow('Messages must be an array');
    await expect(handleChatResponse('not an array', 'AAPL')).rejects.toThrow('Messages must be an array');
    await expect(handleChatResponse(12345, 'AAPL')).rejects.toThrow('Messages must be an array');
    await expect(handleChatResponse({}, 'AAPL')).rejects.toThrow('Messages must be an array');
  });
});
