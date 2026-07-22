# Gemini API Quota Exceeded OpenRouter Fallback Design

## 1. Background and Purpose
In the current application, Google Gemini API is accessed using `GEMINI_API_KEY` and `GEMINI_MODEL_NAME` configuration. If the API hits rate limits or monthly quotas, it throws exceptions containing `"Quota exceeded"`. 
To ensure system high availability, we need to introduce a fallback mechanism to switch dynamically to OpenRouter API (using `OPENROUTER_GEMINI_API_KEY` and `OPENROUTER_GEMINI_MODEL_NAME` environment variables) when such errors occur.

Additionally, the codebase contains an unused file `src/services/geminiService.js` that implements duplicate Gemini calling logic. We will remove this file to maintain codebase cleanliness.

---

## 2. Scope of Changes
We will modify the codebase in the following locations:
1. **Delete File**: `src/services/geminiService.js` (unreferenced duplicate service).
2. **Refactor File**: `src/lib/gemini/client.js` to implement the error-catching and fallback logic.

---

## 3. Detailed Design

### 3.1 Environmental Variables
The following environment variables will be defined in `.env.local` (or standard environment config):
* `OPENROUTER_API_URL`: The full URL endpoint for OpenRouter completion (e.g., `https://openrouter.ai/api/v1/chat/completions`).
* `OPENROUTER_GEMINI_API_KEY`: API key for OpenRouter service.
* `OPENROUTER_GEMINI_MODEL_NAME`: The model name identifier on OpenRouter (e.g., `google/gemini-2.5-flash`).

### 3.2 File Deletion
We will delete `src/services/geminiService.js` since it has no references in the codebase. All existing API routes use the central `src/lib/gemini/client.js` anyway.

### 3.3 Infrastructure Client (`src/lib/gemini/client.js`) Refactoring
We will wrap the core generative execution in a `try...catch` block. If the Google Gemini SDK throws an error containing the string `"Quota exceeded"`, the client will invoke a helper function `callOpenRouter(prompt)` which uses native `fetch` to request completion from OpenRouter.

```mermaid
graph TD
    A[Start callGemini] --> B[Try calling Google Gemini API]
    B --> C{Success?}
    C -->|Yes| D[Return Response]
    C -->|No| E{Error contains "Quota exceeded"?}
    E -->|No| F[Re-throw Error]
    E -->|Yes| G[Log warning and call callOpenRouter]
    G --> H[Read OPENROUTER_API_URL, KEY & MODEL]
    H --> I[Fetch from OpenRouter API]
    I --> J[Return OpenRouter Response]
```

#### Updated client.js Blueprint
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Universal helper to call OpenRouter API.
 * Reads environment configuration directly from process.env.
 * @param {string} prompt - The prompt string.
 * @returns {Promise<string>} Generative text output.
 */
async function callOpenRouter(prompt) {
  const apiUrl = process.env.OPENROUTER_API_URL;
  const apiKey = process.env.OPENROUTER_GEMINI_API_KEY;
  const modelName = process.env.OPENROUTER_GEMINI_MODEL_NAME;

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
 * @param {string} prompt - The final prompt string.
 * @param {Object} options - Optional configuration like model name override or tools.
 * @returns {Promise<string>} Generative text output.
 */
export async function callGemini(prompt, options = {}) {
  const modelName =
    options.model ||
    process.env.GEMINI_MODEL_NAME ||
    'gemini-1.5-flash';
    
  // Enable Google Search grounding tool by default, unless overridden in options
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
    if (errorMsg.includes('Quota exceeded')) {
      console.warn('[Gemini Client] Google Gemini API Quota exceeded. Falling back to OpenRouter API...');
      return await callOpenRouter(prompt);
    }
    // Re-throw if error is not quota related
    throw error;
  }
}
```

---

## 4. Verification and Testing Plan
1. **Mocking Error Behavior**: Add or execute integration tests mocking Google Generative AI to throw a `Quota exceeded` exception. Verify the client correctly calls OpenRouter.
2. **Environmental variables check**: Ensure `.env.local` contains valid key formats and values.
3. **Execution check**: Run `npm run dev` and hit the `/api/fundamental?symbol=AAPL` route under both conditions (normal quota vs. simulated quota exceeded).
