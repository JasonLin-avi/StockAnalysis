---
name: gemini-ai-feature-integration
description: Use when adding a full-stack Gemini AI feature with Google Search grounding, SQLite caching, and Next.js React frontend tabs.
---

# Gemini AI Full-Stack Feature Integration

## Overview
Standard architectural pattern for integrating a Gemini-powered AI feature into a Next.js application. 
Decouples **infrastructure** (SDK client), **domain business logic** (Prompting & SQLite Caching in Route Handlers), and **frontend presentation** (React Markdown & Dark Mode Tab UI).

---

## Layer Architecture & Responsibilities

```
[ Frontend Tab Component (FundamentalTab.jsx) ]
                  │
                  ▼  HTTP GET /api/fundamental?symbol=AAPL
[ Business Route Handler (src/app/api/fundamental/route.js) ]
  • Defines Domain Prompt (Wall Street Analyst Prompt)
  • Checks & Writes SQLite Cache (stock_prompt_analysis table)
                  │
                  ▼  callGemini(prompt, { tools: [{ googleSearch: {} }] })
[ Infrastructure Client (src/lib/gemini/client.js) ]
  • Reads process.env.GEMINI_MODEL_NAME from .env.local
  • Invokes @google/generative-ai SDK with Google Search Grounding
```

---

## Workflow Checklist

### Phase 1: Infrastructure Layer (`src/lib/gemini/client.js`)
- [ ] Create a pure SDK wrapper (zero business logic or prompts).
- [ ] Read model dynamically from `process.env.GEMINI_MODEL_NAME` (fallback to `process.env.GEMINI_MODEL` or `'gemini-1.5-flash'`).
- [ ] Expose `callGemini(prompt, options)`.

### Phase 2: Database Schema & Query Layer (`src/lib/database/`)
- [ ] Define `stock_prompt_analysis` table in `schema.js` and ensure dynamic creation in `connection.js`.
- [ ] Add `getPromptAnalysis` and `savePromptAnalysis` to `queries.js`.
- [ ] **Crucial Check**: Ensure new query functions are exported in `module.exports`.

### Phase 3: Business API Route Layer (`src/app/api/[feature]/route.js`)
- [ ] Define the domain prompt template (e.g. Wall Street Analyst format).
- [ ] Connect using `await connectToDatabase()` (do NOT open raw DB file manually).
- [ ] Check DB cache by `(symbol, analysis_type, date)`.
- [ ] If cache miss, invoke `callGemini()` with `tools: [{ googleSearch: {} }]`.
- [ ] Save result to SQLite cache and return `NextResponse.json({ markdown })`.

### Phase 4: Frontend Component Layer (`FundamentalTab.jsx`)
- [ ] Fetch data client-side from `/api/[feature]?symbol=...`.
- [ ] Provide dark mode loading spinner and error boundary states.
- [ ] Render generated Markdown using `react-markdown` and `remark-gfm` inside a dark card container (`bg-slate-900/30 border-slate-900 backdrop-blur-sm`).

### Phase 5: Page Integration & Tab Navigation (`page.js`)
- [ ] Add `activeTab` state to page.
- [ ] Implement a clean 2-Tab navigation bar (`綜合技術指標` vs `基本面分析`).
- [ ] Conditionally render technical charts & radar widget on Tab 1, and AI Markdown component on Tab 2.

---

## Code Reference Snippets

### 1. Infrastructure Client (`src/lib/gemini/client.js`)
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function callGemini(prompt, options = {}) {
  const modelName =
    options.model ||
    process.env.GEMINI_MODEL_NAME ||
    process.env.GEMINI_MODEL ||
    'gemini-1.5-flash';
    
  const tools = options.tools || [];
  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(tools.length > 0 && { tools })
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

### 2. Business Route Handler (`src/app/api/fundamental/route.js`)
```javascript
import { NextResponse } from 'next/server';
import { callGemini } from '../../../lib/gemini/client';
import { connectToDatabase } from '../../../lib/database/connection';
const { getPromptAnalysis, savePromptAnalysis } = require('../../../lib/database/queries');

export const dynamic = 'force-dynamic';

function getFundamentalPrompt(symbol) {
  return `以華爾街資深股票分析師的角度進行完整分析。
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
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  try {
    const db = await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    const cached = await getPromptAnalysis(db, symbol, 'fundamental', today);
    if (cached) return NextResponse.json({ markdown: cached }, { status: 200 });

    const prompt = getFundamentalPrompt(symbol);
    const markdown = await callGemini(prompt, { tools: [{ googleSearch: {} }] });

    await savePromptAnalysis(db, symbol, 'fundamental', today, markdown);
    return NextResponse.json({ markdown }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### 3. Frontend Tab Component (`FundamentalTab.jsx`)
```jsx
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function FundamentalTab({ symbol }) {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/fundamental?symbol=${symbol}`)
      .then(res => res.json())
      .then(json => setMarkdown(json.markdown))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div>載入中…</div>;

  return (
    <div className="border border-slate-900 bg-slate-900/30 rounded-2xl p-6 backdrop-blur-sm">
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
```

---

## Common Pitfalls & Red Flags

| Red Flag / Problem | Cause | Solution |
|-------------------|-------|----------|
| `TypeError: getPromptAnalysis is not a function` | Forgot to add query functions to `module.exports` in `queries.js`. | Add all new functions to `module.exports` in `queries.js`. |
| `SQLITE_ERROR: no such table` | Directly instantiating `new sqlite3.Database('db.sqlite')` instead of unified connection. | Always use `await connectToDatabase()` to load schema DDL automatically. |
| Hardcoded Gemini prompt in `lib/` | Mixing business domain logic into generic SDK wrapper. | Keep `lib/client.js` generic; put Prompts inside domain Route Handlers. |
| Hardcoded Gemini model string | Ignoring `.env.local` configuration. | Read from `process.env.GEMINI_MODEL_NAME`. |
