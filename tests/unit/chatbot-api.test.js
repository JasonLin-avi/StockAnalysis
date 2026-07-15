/**
 * @fileoverview Unit tests for the Chatbot API Route.
 * Why: Verify that the /api/chat route handles input validation, formats messages
 * correctly for LangChain, and serializes the agent response properly.
 */

const { POST } = require('../../src/app/api/chat/route');
const { financialAdvisorAgent } = require('../../src/lib/chatbot/deep-agent');

// Why: Mock the deep-agent module so we can control mock behavior and isolate testing to the API route logic.
jest.mock('../../src/lib/chatbot/deep-agent', () => ({
  financialAdvisorAgent: {
    invoke: jest.fn()
  }
}));

describe('Chatbot API Route', () => {
  test('POST returns 400 when messages or ticker is missing', async () => {
    // Why: Simulate an empty JSON payload to test if validation triggers and returns a 400 Bad Request error.
    const mockReq = {
      json: async () => ({})
    };
    const res = await POST(mockReq);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Messages and ticker are required');
  });

  test('POST returns updated messages on successful agent invocation', async () => {
    // Why: Mock a successful response from the financialAdvisorAgent graph run.
    financialAdvisorAgent.invoke.mockResolvedValue({
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hello user' }
      ]
    });

    // Why: Simulate a valid request payload containing previous chat messages and target stock ticker.
    const mockReq = {
      json: async () => ({
        messages: [{ role: 'user', content: 'hello' }],
        ticker: 'AAPL'
      })
    };

    const res = await POST(mockReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.messages).toHaveLength(2);
    expect(data.messages[1].content).toBe('hello user');
  });

  test('POST returns 500 and user-friendly error message on agent failure', async () => {
    // Why: Mock agent invocation throwing an error to test the API fallback response.
    financialAdvisorAgent.invoke.mockRejectedValue(new Error('Internal agent failure'));

    const mockReq = {
      json: async () => ({
        messages: [{ role: 'user', content: 'hello' }],
        ticker: 'AAPL'
      })
    };

    const res = await POST(mockReq);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('抱歉，我目前無法連線到 AI 服務。請稍後再試。');
  });
});
