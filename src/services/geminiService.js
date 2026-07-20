// src/services/geminiService.js
// Why: Centralize Gemini API calls and caching logic for stock prompt analyses.
// This service provides function to fetch cached analysis or request fresh Gemini generation.

const { getPromptAnalysis, savePromptAnalysis } = require('../lib/database/queries');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Helper to open DB (assumes DB file at root/db.sqlite)
function openDatabase() {
  const dbPath = path.resolve(process.cwd(), 'db.sqlite');
  return new sqlite3.Database(dbPath);
}

/**
 * Retrieves fundamental analysis markdown for a given stock symbol.
 * Caches result in `stock_prompt_analysis` table.
 * @param {string} symbol Stock ticker symbol
 * @returns {Promise<string>} Markdown content
 */
async function getFundamentalAnalysis(symbol) {
  const db = openDatabase();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  // Try cache first
  const cached = await new Promise((resolve, reject) => {
    getPromptAnalysis(db, symbol, 'fundamental', today)
      .then(resolve)
      .catch(reject);
  });
  if (cached) {
    db.close();
    return cached;
  }

  // Initialize Gemini client
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    tools: [{ googleSearch: {} }]
  });

  // Build a prompt for fundamental analysis
  const prompt = `以華爾街資深股票分析師的角度進行完整分析。
分析股票：${symbol}
內容包括：
• 商業模式與收入來源
• 競爭優勢（護城河）
• 產業趨勢
• 財務健康狀況（營收成長、利潤率、負債）
• 關鍵風險
• 與競爭對手的估值比較
• 多頭、空頭與基本情境分析
• 未來 12–24 個月展望
請用簡單易懂的方式解釋，但保有專業分析深度。`;

  const result = await model.generateContent(prompt);
  const mockMarkdown = result.response?.text() || result.text();
  // Save to cache
  await new Promise((resolve, reject) => {
    savePromptAnalysis(db, symbol, 'fundamental', today, mockMarkdown)
      .then(() => resolve())
      .catch(reject);
  });
  db.close();
  return mockMarkdown;
}

module.exports = { getFundamentalAnalysis };
