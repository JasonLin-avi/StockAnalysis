# Gemini API Quota Exceeded OpenRouter Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a fallback mechanism in `src/lib/gemini/client.js` that catches `"Quota exceeded"` errors and redirects the request to OpenRouter using native fetch with parameters loaded from `.env.local`. Also default the Google Gemini tool configuration to use Google Search Grounding and delete the unused `src/services/geminiService.js`.

**Architecture:** Use global `fetch` to request completion from OpenRouter API inside a helper function `callOpenRouter` defined in `src/lib/gemini/client.js`. Wrap the primary Google Gemini SDK call in a `try...catch` block. Default `tools` to `[{ googleSearch: {} }]` when initiating the Google Generative AI client.

**Tech Stack:** Node.js, `@google/generative-ai`, Jest.

## Global Constraints
* Keep responses in Traditional Chinese (繁體中文) when interacting with the user.
* Do not use `eval()`.
* Follow Google Engineering Standards: describe "Why" rather than "What" in comments.
* Keep options configuration extensible.

---

### Task 1: Clean Up Unused `geminiService.js`

**Files:**
- Delete: `src/services/geminiService.js`

**Interfaces:**
- Consumes: None
- Produces: None

- [ ] **Step 1: Check if tests or other files compile without errors**

Run: `npm run build`
Expected: Success (No compile errors from missing files)

- [ ] **Step 2: Physically delete the unused file**

Run command or remove via file manager. (Make sure to remove `src/services/geminiService.js`)

- [ ] **Step 3: Verify tests still pass**

Run: `npx jest tests/unit/technical-ai-api.test.js`
Expected: PASS

- [ ] **Step 4: Commit cleanup**

```bash
git add src/services/geminiService.js
git commit -m "refactor: remove unused geminiService.js file"
```

---

### Task 2: Create failing unit tests for `callGemini`

**Files:**
- Create: `tests/unit/gemini-client.test.js`

**Interfaces:**
- Consumes: `callGemini` from `src/lib/gemini/client.js`
- Produces: Test suite validating default search grounding, OpenRouter fallback on Quota Exceeded, and error propagation.

- [ ] **Step 1: Create the test file with failing test specs**

Write the following content to `tests/unit/gemini-client.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/unit/gemini-client.test.js`
Expected: FAIL (specifically checking that default tools are empty arrays/failing matching, and Quota exceeded error causes unhandled rejection because fallback fetch is not implemented).

- [ ] **Step 3: Commit initial test suite**

```bash
git add tests/unit/gemini-client.test.js
git commit -m "test: add unit tests for Gemini client tool defaulting and fallback"
```

---

### Task 3: Implement Fallback and Default Tools in `client.js`

**Files:**
- Modify: `src/lib/gemini/client.js`

**Interfaces:**
- Consumes: `process.env` (API key/URL variables)
- Produces: `callGemini(prompt, options)` with automatic OpenRouter fallback on `Quota exceeded` and default googleSearch tool.

- [ ] **Step 1: Implement the logic in `client.js`**

Modify `src/lib/gemini/client.js` to match the following code:

```javascript
// src/lib/gemini/client.js
// Why: Pure infrastructure wrapper for Google Gemini API.
// Reads model configuration from environment variables.
// Fallbacks to OpenRouter API (OpenAI format) if Quota Exceeded error is encountered.

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Universal helper to call OpenRouter API (OpenAI chat completions compatible format).
 * @param {string} prompt - The final prompt string.
 * @returns {Promise<string>} Generative text output.
 */
async function callOpenRouter(prompt) {
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
    // Why: Dynamically intercept Quota exceeded errors and switch to OpenRouter.
    if (errorMsg.includes('Quota exceeded')) {
      console.warn('[Gemini Client] Google Gemini API Quota exceeded. Falling back to OpenRouter API...');
      return await callOpenRouter(prompt);
    }
    throw error;
  }
}
```

- [ ] **Step 2: Run unit tests to verify they now pass**

Run: `npx jest tests/unit/gemini-client.test.js`
Expected: PASS

- [ ] **Step 3: Run all project unit tests to ensure no regressions**

Run: `npm run test` or `npx jest`
Expected: PASS (All tests pass)

- [ ] **Step 4: Commit implementation**

```bash
git add src/lib/gemini/client.js
git commit -m "feat: implement OpenRouter fallback on Quota Exceeded and default to googleSearch tools"
```
