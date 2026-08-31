// src/lib/gemini/client.js
// Why: Pure infrastructure wrapper for Google Gemini API.
// Reads model configuration from environment variables.
// Fallbacks to OpenRouter API (OpenAI format) if Quota Exceeded error is encountered.

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Universal helper to call OpenRouter API (OpenAI chat completions compatible format).
 * @param {string} prompt - The final prompt string.
 * @param {Object} options - Optional configuration options.
 * @returns {Promise<string>} Generative text output.
 */
async function callOpenRouter(prompt, options = {}) {
  let hasWebSearch = false;
  const toolsOption = options.tools !== undefined ? options.tools : [{ googleSearch: {} }];

  if (Array.isArray(toolsOption) && toolsOption.length > 0) {
    hasWebSearch = toolsOption.some(tool => tool && (tool.googleSearch !== undefined || tool.type === 'openrouter:web_search'));
  }

  const apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_GEMINI_API_KEY;
  const modelName = process.env.OPENROUTER_MODEL_NAME || process.env.OPENROUTER_GEMINI_MODEL_NAME || 'google/gemini-2.5-flash';

  // Why: Guard to provide clear actionable message if fallback API key is missing.
  if (!apiKey) {
    throw new Error('Google Gemini API 服務暫時無法使用，且未在環境變數中設定 OpenRouter 備用 API 金鑰（請在 .env.local 中設定 OPENROUTER_API_KEY）。');
  }

  const sendRequest = async (useWebSearch = true) => {
    const payload = {
      model: modelName,
      messages: [
        { role: 'user', content: prompt }
      ],
      ...(useWebSearch && hasWebSearch && { plugins: [{ id: 'web' }] })
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/google/antigravity',
        'X-Title': 'Stock Analysis Platform'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  };

  // Why: First try with web search tools if requested
  let content = '';
  try {
    content = await sendRequest(true);
  } catch (err) {
    // If request with web search fails, fallback to no-tools mode below
  }

  // Why: Defense-in-depth fallback to pure LLM mode without tools if web search produced empty text or error
  if (!content || !content.trim()) {
    content = await sendRequest(false);
  }

  if (!content || !content.trim()) {
    throw new Error('OpenRouter API 回傳空的文字內容。');
  }
  return content;
}

/**
 * Universal helper to call Gemini API.
 * Defaults to Google Search tool grounding if not overridden.
 * @param {string} prompt - The final prompt string.
 * @param {Object} options - Optional configuration like model name override or tools.
 * @returns {Promise<string>} Generative text output.
 */
export async function callGemini(prompt, options = {}) {
  // Model priority: options.model -> process.env.GEMINI_MODEL_NAME -> process.env.GEMINI_MODEL -> fallback 'gemini-1.5-flash'
  const modelName =
    options.model ||
    process.env.GEMINI_MODEL_NAME ||
    process.env.GEMINI_MODEL ||
    'gemini-1.5-flash';
    
  // Why: Enable Google Search tool grounding by default, allowing customization or disabling via options.
  const tools = options.tools !== undefined ? options.tools : [{ googleSearch: {} }];

  try {
    // Why: Dynamically instantiate GoogleGenerativeAI per request to guarantee fresh GEMINI_API_KEY from process.env
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: modelName,
      ...(tools.length > 0 && { tools })
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text || !text.trim()) {
      throw new Error('Google Gemini API 回傳空的文字內容。');
    }
    return text;
  } catch (error) {
    const errorMsg = error?.message || '';
    console.warn(`[Gemini Client] Google Gemini API error (${errorMsg}). Falling back to OpenRouter API...`);
    try {
      return await callOpenRouter(prompt, options);
    } catch (openRouterErr) {
      // If OpenRouter also fails or isn't configured, throw composite error message
      throw new Error(`[Gemini Client] 官方 API 與 OpenRouter 均存取失敗。原始錯誤: ${errorMsg} | 備用 API 錯誤: ${openRouterErr.message}`);
    }
  }
}
