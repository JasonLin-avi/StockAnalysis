// tests/unit/gemini-client.test.js
// Why: Test that client.js defaults to googleSearch tools, redirects to OpenRouter on Quota exceeded, and bubbles up other errors.

const { callGemini } = require('../../src/lib/gemini/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

jest.mock('@google/generative-ai');

describe('Gemini Client', () => {
  let mockGenerateContent;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent = jest.fn();
    GoogleGenerativeAI.prototype.getGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent
    });
    
    // Mock global fetch
    global.fetch = jest.fn();
    
    // Setup mock env variables
    process.env.GEMINI_API_KEY = 'mock-google-key';
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    process.env.OPENROUTER_GEMINI_API_KEY = 'mock-openrouter-key';
    process.env.OPENROUTER_GEMINI_MODEL_NAME = 'google/gemini-2.5-flash';
  });

  test('calls Google Gemini API successfully with default search tool', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Google response'
      }
    });

    const result = await callGemini('Hello World');

    expect(result).toBe('Google response');
    expect(GoogleGenerativeAI.prototype.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-1.5-flash',
      tools: [{ googleSearch: {} }]
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('falls back to OpenRouter when Google Gemini API throws Quota exceeded', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded for this project.'));
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OpenRouter response' } }]
      })
    });

    const result = await callGemini('Hello World');

    expect(result).toBe('OpenRouter response');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-openrouter-key',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: 'Hello World' }]
        })
      })
    );
  });

  test('throws original error if error is not quota related', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Invalid API key'));

    await expect(callGemini('Hello World')).rejects.toThrow('Invalid API key');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
