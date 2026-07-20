# Kline Technical AI Interpretation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Gemini AI technical interpretation feature for the K-Line chart tab (`KlineTab.jsx`), displaying senior quantitative trader insights beneath the quantitative technical diagnosis card.

**Architecture:** Create a dedicated API route (`/api/stock/[symbol]/technical-ai`) that fetches historical prices, computes technical indicator features (`generateLLMTechnicalSummary`), formats the domain prompt, calls the generic Gemini client (`callGemini`), and caches results in SQLite (`stock_prompt_analysis`). The frontend `KlineTab.jsx` component renders the resulting Markdown via `react-markdown` in a full-width dark-mode glassmorphism card.

**Tech Stack:** Next.js 14 App Router (React 18), Google Generative AI SDK (`@google/generative-ai`), SQLite (`sqlite3`), `react-markdown`, `remark-gfm`, Tailwind CSS, Jest, React Testing Library.

## Global Constraints

- Backend route handles domain logic; generic SDK calls remain in `src/lib/gemini/client.js`.
- SQLite caching key: `(symbol, 'technical', YYYY-MM-DD)`.
- Default to `process.env.GEMINI_MODEL_NAME` (fallback `'gemini-1.5-flash'`).
- Handle price history < 60 days gracefully without throwing or calling external APIs unnecessarily.

---

### Task 1: Create AI Technical Interpretation API Route and Unit Tests

**Files:**
- Create: `src/app/api/stock/[symbol]/technical-ai/route.js`
- Test: `tests/unit/technical-ai-api.test.js`
- Modify: `src/lib/database/queries.js` (Verify `getPromptAnalysis` and `savePromptAnalysis` are exported)

**Interfaces:**
- Consumes: `connectToDatabase()` from `src/lib/database/connection.js`, `getHistoricalPricesFromDB`, `getPromptAnalysis`, `savePromptAnalysis` from `src/lib/database/queries.js`, `generateLLMTechnicalSummary` from `src/lib/technical-analysis/klineanalysis.js`, `callGemini` from `src/lib/gemini/client.js`.
- Produces: `GET /api/stock/[symbol]/technical-ai` returning `{ markdown: string }`.

- [ ] **Step 1: Write the failing unit test for API Route**

Create `tests/unit/technical-ai-api.test.js`:
```javascript
const { GET } = require('../../src/app/api/stock/[symbol]/technical-ai/route');
const { connectToDatabase } = require('../../src/lib/database/connection');
const queries = require('../../src/lib/database/queries');
const { callGemini } = require('../../src/lib/gemini/client');

jest.mock('../../src/lib/database/connection');
jest.mock('../../src/lib/database/queries');
jest.mock('../../src/lib/gemini/client');

describe('GET /api/stock/[symbol]/technical-ai', () => {
  const mockDb = {};

  beforeEach(() => {
    jest.clearAllMocks();
    connectToDatabase.mockResolvedValue(mockDb);
  });

  test('returns 400 if symbol parameter is missing', async () => {
    const request = new Request('http://localhost/api/stock//technical-ai');
    const response = await GET(request, { params: {} });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Symbol parameter is required');
  });

  test('returns cached markdown when SQLite cache hits', async () => {
    queries.getPromptAnalysis.mockResolvedValue('## Cached AI Analysis');

    const request = new Request('http://localhost/api/stock/AAPL/technical-ai');
    const response = await GET(request, { params: { symbol: 'AAPL' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toBe('## Cached AI Analysis');
    expect(callGemini).not.toHaveBeenCalled();
  });

  test('returns fallback message when historical prices < 60 days', async () => {
    queries.getPromptAnalysis.mockResolvedValue(null);
    queries.saveStock = jest.fn().mockResolvedValue(1);
    queries.getHistoricalPricesFromDB.mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({
      date: `2026-06-${i + 1}`, open: 100, high: 105, low: 95, close: 102, volume: 10000
    })));

    const request = new Request('http://localhost/api/stock/SHORT/technical-ai');
    const response = await GET(request, { params: { symbol: 'SHORT' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toContain('歷史數據不足');
    expect(callGemini).not.toHaveBeenCalled();
  });

  test('fetches price data, generates prompt, calls Gemini, and caches result on cache miss', async () => {
    queries.getPromptAnalysis.mockResolvedValue(null);
    queries.saveStock = jest.fn().mockResolvedValue(1);
    queries.getHistoricalPricesFromDB.mockResolvedValue(Array.from({ length: 70 }, (_, i) => ({
      date: `2026-05-${(i % 30) + 1}`, open: 100 + i, high: 105 + i, low: 95 + i, close: 102 + i, volume: 50000
    })));

    callGemini.mockResolvedValue('## Fresh Gemini AI Analysis');

    const request = new Request('http://localhost/api/stock/AAPL/technical-ai');
    const response = await GET(request, { params: { symbol: 'AAPL' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toBe('## Fresh Gemini AI Analysis');
    expect(callGemini).toHaveBeenCalledWith(
      expect.stringContaining('你是一位擁有 15 年經驗的資深量化交易員與資產配置專家'),
      expect.objectContaining({ tools: [{ googleSearch: {} }] })
    );
    expect(queries.savePromptAnalysis).toHaveBeenCalledWith(
      mockDb,
      'AAPL',
      'technical',
      expect.any(String),
      '## Fresh Gemini AI Analysis'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/technical-ai-api.test.js`
Expected: FAIL with "Cannot find module '../../src/app/api/stock/[symbol]/technical-ai/route'"

- [ ] **Step 3: Implement API Route Handler**

Create `src/app/api/stock/[symbol]/technical-ai/route.js`:
```javascript
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/database/connection';
import { saveStock, getHistoricalPricesFromDB, getPromptAnalysis, savePromptAnalysis } from '../../../../../lib/database/queries';
import { syncStockPricesIncremental } from '../../../../../lib/data-fetcher';
import { generateLLMTechnicalSummary } from '../../../../../lib/technical-analysis/klineanalysis';
import { callGemini } from '../../../../../lib/gemini/client';

export const dynamic = 'force-dynamic';

function getTechnicalAIPrompt(symbol, summaryJson) {
  return `# Role (角色設定)
你是一位擁有 15 年經驗的資深量化交易員與資產配置專家。你的分析風格兼顧宏觀趨勢與微觀進出，既看重長線價值與波段結構，也重視短線的風險報酬比（Risk/Reward Ratio），絕不給予絕對且不負責任的保證。

# Task (任務說明)
請根據下方提供的結構化技術特徵 JSON 數據（包含短中長線指標），進行全方位的技術面與趨勢解讀，並針對該標的提出**「長線波段佈局」**與**「短線操作節奏」**的綜合建議與風險控管方針。

# Input Data (輸入數據)
\`\`\`json
${JSON.stringify(summaryJson, null, 2)}
\`\`\`

請以專業、清晰且結構化的 Markdown 格式輸出分析報告。`;
}

export async function GET(request, context) {
  try {
    const params = await (context?.params || {});
    const symbol = params?.symbol;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    const upperSymbol = symbol.toUpperCase();
    const db = await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Check DB cache
    const cached = await getPromptAnalysis(db, upperSymbol, 'technical', today);
    if (cached) {
      return NextResponse.json({ markdown: cached }, { status: 200 });
    }

    // Ensure stock record exists and sync incremental prices
    const stockId = await saveStock(db, {
      symbol: upperSymbol,
      market: upperSymbol.includes('.') ? 'TW' : 'US'
    });

    if (typeof syncStockPricesIncremental === 'function') {
      try {
        await syncStockPricesIncremental(db, stockId, upperSymbol);
      } catch (syncErr) {
        console.warn(`[API_TECHNICAL_AI] Incremental sync warning for ${upperSymbol}:`, syncErr.message);
      }
    }

    const prices = await getHistoricalPricesFromDB(db, stockId);

    if (!prices || prices.length < 60) {
      const fallbackMarkdown = `### ⚠️ 數據不足提示\n\n歷史交易數據不足（少於 60 個交易日），無法計算完整長短線指標與生成 AI 深度技術解讀。`;
      return NextResponse.json({ markdown: fallbackMarkdown }, { status: 200 });
    }

    const rawData = {
      dates: prices.map(p => p.date),
      opens: prices.map(p => p.open),
      highs: prices.map(p => p.high),
      lows: prices.map(p => p.low),
      closes: prices.map(p => p.close),
      volumes: prices.map(p => p.volume)
    };

    const summaryJson = generateLLMTechnicalSummary(rawData);
    const prompt = getTechnicalAIPrompt(upperSymbol, summaryJson);

    const markdown = await callGemini(prompt, {
      tools: [{ googleSearch: {} }]
    });

    await savePromptAnalysis(db, upperSymbol, 'technical', today, markdown);

    return NextResponse.json({ markdown }, { status: 200 });
  } catch (error) {
    console.error('[API_TECHNICAL_AI] Exception in GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/technical-ai-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add src/app/api/stock/[symbol]/technical-ai/route.js tests/unit/technical-ai-api.test.js
git commit -m "feat: add AI technical interpretation API endpoint with SQLite caching"
```

---

### Task 2: Integrate `TechnicalAISummaryPanel` into `KlineTab.jsx` with UI Tests

**Files:**
- Modify: `src/app/stock/[symbol]/KlineTab.jsx`
- Modify: `tests/ui/kline-tab.test.js`

**Interfaces:**
- Consumes: `GET /api/stock/[symbol]/technical-ai`
- Produces: Full-width AI technical diagnosis card in `KlineTab.jsx` using `react-markdown` and `remark-gfm`.

- [ ] **Step 1: Write failing UI test in `tests/ui/kline-tab.test.js`**

Add a test case to `tests/ui/kline-tab.test.js`:
```javascript
  test('fetches and renders TechnicalAISummaryPanel markdown content below chart', async () => {
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/stock/AAPL/technical-ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ markdown: '### 🤖 AI 深度技術解讀\n\n建議**長線波段佈局**逢低分批加碼。' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleKlineResponse)
      });
    });

    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    await waitFor(() => {
      expect(screen.getByText('🤖 15年資深量化專家 AI 深度診斷')).toBeInTheDocument();
      expect(screen.getByText(/長線波段佈局/)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/ui/kline-tab.test.js`
Expected: FAIL with `Unable to find an element with text: 🤖 15年資深量化專家 AI 深度診斷`

- [ ] **Step 3: Update `KlineTab.jsx` with `TechnicalAISummaryPanel` Subcomponent**

In `src/app/stock/[symbol]/KlineTab.jsx`:
Import `ReactMarkdown` and `remarkGfm`:
```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
```

Add `TechnicalAISummaryPanel` subcomponent:
```jsx
function TechnicalAISummaryPanel({ symbol }) {
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAIAnalysis = async () => {
      if (!symbol) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stock/${symbol}/technical-ai`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: 讀取 AI 解讀失敗`);
        }
        const json = await res.json();
        if (isMounted) {
          setMarkdown(json.markdown || '');
        }
      } catch (err) {
        console.error('[TechnicalAISummaryPanel] Fetch error:', err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAIAnalysis();

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-xl mt-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
          🤖 15年資深量化專家 AI 深度診斷
        </h4>
        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
          Quant AI Grounding
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-indigo-500/40 animate-pulse" />
            <span className="text-sm text-slate-400 animate-pulse">AI 量化專家正在對 K 線與指標進行深度分析...</span>
          </div>
          <div className="h-4 bg-slate-800/80 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-slate-800/80 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-slate-800/80 rounded animate-pulse w-2/3" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-4">
          解讀失敗: {error}
        </div>
      ) : (
        <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

Render `<TechnicalAISummaryPanel symbol={symbol} />` at the bottom of `KlineTab`:
```jsx
  return (
    <div className="space-y-6">
      {/* ... controls and main grid ... */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">{/* Chart container */}</div>
        <div><SummaryPanel summary={data?.summary} isLoading={isLoading} /></div>
      </div>

      {/* Full width AI Technical Analysis Panel */}
      <TechnicalAISummaryPanel symbol={symbol} />
    </div>
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/ui/kline-tab.test.js`
Expected: PASS

- [ ] **Step 5: Run full test suite & build check**

Run: `npm test && npm run build`
Expected: PASS and build succeeds.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/app/stock/[symbol]/KlineTab.jsx tests/ui/kline-tab.test.js
git commit -m "feat: integrate full-width AI technical diagnosis panel in KlineTab UI"
```
