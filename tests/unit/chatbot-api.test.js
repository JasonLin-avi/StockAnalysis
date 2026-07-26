/**
 * @fileoverview Unit tests for the Chatbot API Route.
 * Why: Verify that the /api/chat route handles input validation, delegates to the
 * chatbot service layer, and formats error responses correctly.
 */

// Why: Mock the chatbot service (not deep-agent) because the route delegates to the service layer.
jest.mock('../../src/services/chatbot.service', () => ({
  __esModule: true,
  default: {
    handleChatResponse: jest.fn()
  },
  handleChatResponse: jest.fn()
}));

// Why: Mock logger to prevent console noise during tests.
jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { POST } from '../../src/app/api/chat/route';

// Why: Import the mocked service to control return values in each test case.
const chatbotService = require('../../src/services/chatbot.service');
const mockHandleChatResponse = chatbotService.default?.handleChatResponse || chatbotService.handleChatResponse;

describe('Chatbot API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  test('POST returns updated messages on successful service invocation', async () => {
    // Why: Mock a successful response from the chatbot service.
    mockHandleChatResponse.mockResolvedValue([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hello user' }
    ]);

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

  test('POST returns 500 and user-friendly error message on service failure', async () => {
    // Why: Mock service invocation throwing an error to test the API fallback response.
    mockHandleChatResponse.mockRejectedValue(new Error('Internal service failure'));

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
