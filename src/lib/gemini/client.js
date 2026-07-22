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
  if (options.tools && Array.isArray(options.tools) && options.tools.some(tool => tool && tool.googleSearch !== undefined)) {
    console.warn('[Gemini Client] Google Search tool grounding is not supported on OpenRouter and will be skipped.');
  }

  const apiUrl = process.env.OPENROUTER_API_URL;
  const apiKey = process.env.OPENROUTER_GEMINI_API_KEY;
  const modelName = process.env.OPENROUTER_GEMINI_MODEL_NAME;

  // Why: Guard to prevent calls with missing configuration.
  if (!apiUrl) {
    throw new Error('OPENROUTER_API_URL is not set in environment variables');
  }
  if (!apiKey) {
    throw new Error('OPENROUTER_GEMINI_API_KEY is not set in environment variables');
  }
  if (!modelName) {
    throw new Error('OPENROUTER_GEMINI_MODEL_NAME is not set in environment variables');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/google/antigravity',
      'X-Title': 'Stock Analysis Platform'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Universal helper to call Gemini API.
 * Defaults to Google Search tool grounding if not overridden.
 * @param {string} prompt - The final prompt string.
 * @param {Object} options - Optional configuration like model name override or tools.
 * @returns {Promise<string>} Generative text output.
 */
export async function callGemini(prompt, options = {}) {
  // Model priority: options.model -> process.env.GEMINI_MODEL_NAME -> fallback 'gemini-1.5-flash'
  const modelName =
    options.model ||
    process.env.GEMINI_MODEL_NAME ||
    'gemini-1.5-flash';
    
  // Why: Enable Google Search tool grounding by default, allowing customization or disabling via options.
  const tools = options.tools !== undefined ? options.tools : [{ googleSearch: {} }];

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      ...(tools.length > 0 && { tools })
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    const errorMsg = error?.message || '';
    // Why: Dynamically intercept Quota exceeded errors (case-insensitive) and switch to OpenRouter.
    if (/quota exceeded/i.test(errorMsg)) {
      console.warn('[Gemini Client] Google Gemini API Quota exceeded. Falling back to OpenRouter API...');
      return await callOpenRouter(prompt, options);
    }
    throw error;
  }
}
