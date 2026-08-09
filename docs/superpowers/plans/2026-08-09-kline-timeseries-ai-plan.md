# Kline Time-Series AI Technical Interpretation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the single-snapshot Technical AI interpretation into an interactive, time-series-driven panel where users can select/input reference days (15, 30, 60, or custom 5-120 days) and trigger Gemini AI analysis on demand.

**Architecture:** Extend `klineanalysis.js` with `generateLLMTimeSeriesSummary` to format daily price action, volume, MA5, MA20, MA60, RSI14, and MACD Histogram over N days into a Markdown table. Update `/api/stock/[symbol]/technical-ai` to parse `?days=N` query param and cache results per parameter in SQLite (`${symbol}_technical_ai_${days}`). Update `KlineTab.jsx` UI with preset dropdown, custom number input, and trigger button.

**Tech Stack:** Next.js (App Router), React, SQLite (better-sqlite3 / custom db client), Jest.

## Global Constraints
- Preserve backward compatibility when `days` param is missing (default to 30 days).
- Clamped days range: 5 to 120 days.
- Include MA60 in the time-series Markdown table.

---

### Task 1: Time-Series Calculation Helper (`generateLLMTimeSeriesSummary`)

**Files:**
- Modify: `src/lib/technical-analysis/klineanalysis.js`
- Test: `tests/unit/klineanalysis.test.js`

**Interfaces:**
- Consumes: `rawData = { dates, opens, highs, lows, closes, volumes }`
- Produces: `generateLLMTimeSeriesSummary(rawData, days = 30)` returning `{ markdownTable: string, daysCalculated: number, summaryStats: object }`

- [ ] **Step 1: Write failing unit test**

Create/update `tests/unit/klineanalysis.test.js` to test `generateLLMTimeSeriesSummary`:

```javascript
const { generateLLMTimeSeriesSummary } = require('../../src/lib/technical-analysis/klineanalysis');

describe('generateLLMTimeSeriesSummary', () => {
  const generateMockBars = (count) => {
    const dates = [];
    const opens = [];
    const highs = [];
    const lows = [];
    const closes = [];
    const volumes = [];
    for (let i = 0; i < count; i++) {
      dates.push(`2026-01-${String(i + 1).padStart(2, '0')}`);
      opens.push(100 + i);
      highs.push(105 + i);
      lows.push(99 + i);
      closes.push(102 + i);
      volumes.push(1000000 + i * 10000);
    }
    return { dates, opens, highs, lows, closes, volumes };
  };

  test('generates markdown table with correct column headers including MA60', () => {
    const mockData = generateMockBars(70);
    const result = generateLLMTimeSeriesSummary(mockData, 15);
    expect(result.markdownTable).toContain('| 日期 | 收盤價 | 漲跌幅 | 成交量 | MA5 | MA20 | MA60 | RSI14 | MACD柱體 |');
    expect(result.daysCalculated).toBe(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/klineanalysis.test.js`
Expected: FAIL with `generateLLMTimeSeriesSummary is not a function`

- [ ] **Step 3: Implement `generateLLMTimeSeriesSummary` in `src/lib/technical-analysis/klineanalysis.js`**

Add implementation to `klineanalysis.js`:

```javascript
function generateLLMTimeSeriesSummary(rawData, days = 30) {
    const { dates, opens, highs, lows, closes, volumes } = rawData;
    const minRequired = Math.max(60, days);
    if (!closes || closes.length < minRequired) {
        throw new Error(`數據量不足，至少需要 ${minRequired} 筆資料計算指標。`);
    }

    const closeArr = Array.from(closes);
    const sma5 = SMA.calculate({ period: 5, values: closeArr });
    const sma20 = SMA.calculate({ period: 20, values: closeArr });
    const sma60 = SMA.calculate({ period: 60, values: closeArr });
    const rsi14 = RSI.calculate({ period: 14, values: closeArr });
    const macdResult = MACD.calculate({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        values: closeArr,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });

    const targetDays = Math.min(days, closes.length);
    const startIndex = closes.length - targetDays;

    const rows = [];
    rows.push('| 日期 | 收盤價 | 漲跌幅 | 成交量 | MA5 | MA20 | MA60 | RSI14 | MACD柱體 |');
    rows.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');

    for (let i = startIndex; i < closes.length; i++) {
        const d = dates[i];
        const c = closes[i];
        const prevC = i > 0 ? closes[i - 1] : c;
        const changePct = (((c - prevC) / prevC) * 100).toFixed(2);
        const changeStr = changePct >= 0 ? `+${changePct}%` : `${changePct}%`;
        const volFormatted = (volumes[i] / 1000000).toFixed(1) + 'M';

        // Alignment with indicators output lengths
        const ma5Val = sma5[i - 4] !== undefined ? sma5[i - 4].toFixed(2) : '-';
        const ma20Val = sma20[i - 19] !== undefined ? sma20[i - 19].toFixed(2) : '-';
        const ma60Val = sma60[i - 59] !== undefined ? sma60[i - 59].toFixed(2) : '-';
        const rsiVal = rsi14[i - 13] !== undefined ? rsi14[i - 13].toFixed(2) : '-';
        const macdVal = macdResult[i - 33] !== undefined ? macdResult[i - 33].histogram.toFixed(2) : '-';

        rows.push(`| ${d} | ${c.toFixed(2)} | ${changeStr} | ${volFormatted} | ${ma5Val} | ${ma20Val} | ${ma60Val} | ${rsiVal} | ${macdVal} |`);
    }

    return {
        markdownTable: rows.join('\n'),
        daysCalculated: targetDays,
        summaryStats: {
            currentClose: closes[closes.length - 1],
            highest: Math.max(...highs.slice(-targetDays)),
            lowest: Math.min(...lows.slice(-targetDays))
        }
    };
}
```
Export `generateLLMTimeSeriesSummary` alongside existing exports.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/klineanalysis.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/technical-analysis/klineanalysis.js tests/unit/klineanalysis.test.js
git commit -m "feat: add generateLLMTimeSeriesSummary helper for time-series prompt"
```

---

### Task 2: API Route Query Parameter & Cache Key Extension

**Files:**
- Modify: `src/app/api/stock/[symbol]/technical-ai/route.js`
- Modify: `tests/unit/technical-ai-api.test.js`

**Interfaces:**
- Consumes: HTTP GET `/api/stock/[symbol]/technical-ai?days=N`
- Produces: JSON response `{ markdown: string, days: number }`

- [ ] **Step 1: Write failing unit test for `days` query param in API route**

Update `tests/unit/technical-ai-api.test.js`:

```javascript
test('handles custom days query parameter and uses specific cache key', async () => {
  const request = new Request('http://localhost/api/stock/AAPL/technical-ai?days=15');
  const response = await GET(request, { params: { symbol: 'AAPL' } });
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.days).toBe(15);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/technical-ai-api.test.js`
Expected: FAIL (missing `days` field or ignoring query param)

- [ ] **Step 3: Update `src/app/api/stock/[symbol]/technical-ai/route.js`**

1. Parse query param `days` from `request.url` (clamp value between 5 and 120, default 30).
2. Set cache key to `${symbol}_technical_ai_${days}`.
3. Call `generateLLMTimeSeriesSummary(rawData, days)`.
4. Construct Prompt containing persona + Time-Series Markdown Table.
5. Return JSON `{ markdown, days }`.

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `npx jest tests/unit/technical-ai-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stock/[symbol]/technical-ai/route.js tests/unit/technical-ai-api.test.js
git commit -m "feat: support days query param and per-range cache key in technical-ai API"
```

---

### Task 3: KlineTab UI Controls and On-Demand Fetching

**Files:**
- Modify: `src/app/stock/[symbol]/KlineTab.jsx`
- Modify: `tests/ui/kline-tab.test.js`

**Interfaces:**
- Consumes: User selection (preset / custom days) + button click
- Produces: GET request `/api/stock/${symbol}/technical-ai?days=${days}` and renders Markdown card

- [ ] **Step 1: Write failing UI test**

Update `tests/ui/kline-tab.test.js`:

```javascript
test('allows selecting days and clicking button to trigger technical AI analysis', async () => {
  render(<KlineTab symbol="AAPL" rawData={mockRawData} />);
  
  // Select preset or input days
  const select = screen.getByRole('combobox', { name: /參考天數/i });
  fireEvent.change(select, { target: { value: '15' } });

  // Click trigger button
  const button = screen.getByRole('button', { name: /執行 15年專家 AI 診斷/i });
  fireEvent.click(button);

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/technical-ai?days=15');
  });
});
```

- [ ] **Step 2: Run UI test to verify it fails**

Run: `npx jest tests/ui/kline-tab.test.js`
Expected: FAIL

- [ ] **Step 3: Update `KlineTab.jsx`**

1. Add state: `selectedDaysPreset` ('15', '30', '60', 'custom'), `customDays` (30), `hasTriggered` (false).
2. Add control bar above/inside Technical AI diagnosis panel:
   - Preset dropdown: `15 天`, `30 天 (預設)`, `60 天`, `自訂`
   - If `custom`, show number input (min: 5, max: 120).
   - Button: `🤖 執行 15年專家 AI 診斷`.
3. Update `fetchTechnicalAI`: fetch `/api/stock/${symbol}/technical-ai?days=${activeDays}` on button click.

- [ ] **Step 4: Run UI tests to verify they pass**

Run: `npx jest tests/ui/kline-tab.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/stock/[symbol]/KlineTab.jsx tests/ui/kline-tab.test.js
git commit -m "feat: add time-series days selector and manual trigger to KlineTab UI"
```

---

### Task 4: End-to-End Verification

- [ ] **Step 1: Run all test suites**

Run: `npx jest tests/unit/klineanalysis.test.js tests/unit/technical-ai-api.test.js tests/ui/kline-tab.test.js`
Expected: All tests PASS.

- [ ] **Step 2: Commit final changes if any**

```bash
git commit --allow-empty -m "chore: complete kline time-series AI technical interpretation feature"
```
