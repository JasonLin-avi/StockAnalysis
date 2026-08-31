// tests/unit/gemini-client.test.js
// Why: Test that client.js defaults to googleSearch tools, redirects to OpenRouter on Quota exceeded, and bubbles up other errors.

import { callGemini }  from '../../src/external/gemini/client';
import { GoogleGenerativeAI }  from '@google/generative-ai';

jest.mock('@google/generative-ai');

describe('Gemini Client', () => {
  let mockGenerateContent;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent = jest.fn();
    GoogleGenerativeAI.prototype.getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });
    
    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => ''
    });
    
    // Setup mock env variables
    process.env.GEMINI_API_KEY = 'mock-google-key';
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    process.env.OPENROUTER_API_KEY = 'mock-openrouter-key';
    process.env.OPENROUTER_MODEL_NAME = 'google/gemini-2.5-flash';
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
          messages: [{ role: 'user', content: 'Hello World' }],
          plugins: [{ id: 'web' }]
        })
      })
    );
  });

  test('falls back to OpenRouter when Google Gemini API throws 503 Service Unavailable / high demand', async () => {
    mockGenerateContent.mockRejectedValue(new Error('[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [503 Service Unavailable] This model is currently experiencing high demand.'));
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OpenRouter fallback response' } }]
      })
    });

    const result = await callGemini('Hello World');

    expect(result).toBe('OpenRouter fallback response');
    expect(global.fetch).toHaveBeenCalled();
  });

  test('reads model from GEMINI_MODEL if GEMINI_MODEL_NAME is not set', async () => {
    delete process.env.GEMINI_MODEL_NAME;
    process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
    
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Response'
      }
    });

    await callGemini('Hello World');

    expect(GoogleGenerativeAI.prototype.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-3.5-flash-lite',
      tools: [{ googleSearch: {} }]
    });
  });

  test('uses OPENROUTER_API_KEY if OPENROUTER_GEMINI_API_KEY is missing', async () => {
    delete process.env.OPENROUTER_GEMINI_API_KEY;
    process.env.OPENROUTER_API_KEY = 'mock-general-or-key';
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'OR content' } }] })
    });

    const result = await callGemini('Test');
    expect(result).toBe('OR content');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-general-or-key'
        })
      })
    );
  });

  test('throws informative error when OpenRouter API key is missing during fallback', async () => {
    delete process.env.OPENROUTER_GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

    await expect(callGemini('Test')).rejects.toThrow(/OpenRouter 備用 API 金鑰/);
  });

  test('throws error when OpenRouter API call fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded for this project.'));
    
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    });

    await expect(callGemini('Hello World')).rejects.toThrow(/OpenRouter API error \(500\)/);
  });

  test('falls back to OpenRouter when Google Gemini API throws any error including 403 or invalid key', async () => {
    mockGenerateContent.mockRejectedValue(new Error('403 Forbidden: Method doesn\'t allow unregistered callers'));
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OpenRouter fallback response' } }]
      })
    });

    const result = await callGemini('Hello World');
    expect(result).toBe('OpenRouter fallback response');
    expect(global.fetch).toHaveBeenCalled();
  });

  test('correctly converts googleSearch tool to openrouter:web_search payload in OpenRouter fallback', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini quota exceeded'));

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Web search result content' } }]
      })
    });

    const result = await callGemini('分析台積電最新營收', {
      tools: [{ googleSearch: {} }]
    });

    expect(result).toBe('Web search result content');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: '分析台積電最新營收' }],
          plugins: [{ id: 'web' }]
        })
      })
    );
  });

  test('omits tools payload when tools option is explicitly disabled (empty array)', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini error'));

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'No search tool result' } }]
      })
    });

    const result = await callGemini('純計算題 1+1', { tools: [] });

    expect(result).toBe('No search tool result');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: '純計算題 1+1' }]
        })
      })
    );
  });
});
