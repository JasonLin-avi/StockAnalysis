// src/lib/gemini/client.js
// Why: Pure infrastructure wrapper for Google Gemini API.
// Reads model configuration from environment variables (e.g. GEMINI_MODEL_NAME or GEMINI_MODEL).

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Universal helper to call Gemini API.
 * @param {string} prompt - The final prompt string.
 * @param {Object} options - Optional configuration like model name override or tools.
 * @returns {Promise<string>} Generative text output.
 */
export async function callGemini(prompt, options = {}) {
  // Model priority: options.model -> process.env.GEMINI_MODEL_NAME -> process.env.GEMINI_MODEL -> fallback 'gemini-1.5-flash'
  const modelName =
    options.model ||
    process.env.GEMINI_MODEL_NAME ||
    'gemini-1.5-flash';
    
  const tools = options.tools || [];

  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(tools.length > 0 && { tools })
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
