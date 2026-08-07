# Dynamic Lookback & Full Time-Series Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the backtest UI with a historical lookback selector (`lookbackDays`) including custom input support, and update `/api/backtest/predict/route.js` to render a complete daily K-line & indicator time-series Markdown table in the 15-year quant trader persona prompt.

**Architecture:** Update `EmbeddedBacktestPanel.jsx` to render the `lookbackDays` control (5d, 20d, 60d [Default], or custom numeric input) and pass `lookbackDays` to the predict API. Update `/api/backtest/predict/route.js` to compute daily MA5, MA20, MA60, RSI(14), and MACD for all bars in the lookback window, format a complete time-series Markdown table, and inject it into Gemini LLM.

**Tech Stack:** Next.js (App Router), React, JavaScript (ES6+), Gemini AI SDK, TechnicalIndicators library, Jest (@testing-library/react).

## Global Constraints

- Tech Stack: React.js + Tailwind CSS frontend, Next.js backend.
- Code Style: Google Engineering Standards, comments focus on "Why" rather than "What".
- Automated Testing: Verify all changes with Jest tests.

---

### Task 1: Add Historical Lookback Controls to `EmbeddedBacktestPanel.jsx`

**Files:**
- Modify: `src/components/backtest/EmbeddedBacktestPanel.jsx`
- Test: `tests/ui/embedded-backtest-panel.test.js`

**Interfaces:**
- Consumes: User selection for lookback history (`5`, `20`, `60`, `custom`) and optional custom numeric input.
- Produces: Sends `lookbackDays` payload in `fetch('/api/backtest/predict')`.

- [ ] **Step 1: Write failing unit test for lookback selector in `embedded-backtest-panel.test.js`**

```javascript
// tests/ui/embedded-backtest-panel.test.js
test('renders historical lookback dropdown and handles custom lookback days input', () => {
  render(<EmbeddedBacktestPanel symbol="2330.TW" />);

  expect(screen.getByLabelText(/歷史參考長度/i)).toBeInTheDocument();

  const lookbackSelect = screen.getByLabelText(/歷史參考長度/i);
  fireEvent.change(lookbackSelect, { target: { value: 'custom' } });

  expect(screen.getByPlaceholderText(/參考天數/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/ui/embedded-backtest-panel.test.js`
Expected: FAIL with "Unable to find label /歷史參考長度/i"

- [ ] **Step 3: Update `EmbeddedBacktestPanel.jsx` to include lookback controls**

In `src/components/backtest/EmbeddedBacktestPanel.jsx`:
1. Add state: `const [lookbackOption, setLookbackOption] = useState('60');`
2. Add state: `const [customLookbackDays, setCustomLookbackDays] = useState(90);`
3. Compute: `const activeLookbackDays = lookbackOption === 'custom' ? parseInt(customLookbackDays, 10) || 60 : parseInt(lookbackOption, 10);`
4. Update `handlePredict` body to send `lookbackDays: activeLookbackDays`.
5. Render lookback dropdown (`#embedded-lookback-select`) and custom input field (`#custom-lookback-input`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/ui/embedded-backtest-panel.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/backtest/EmbeddedBacktestPanel.jsx tests/ui/embedded-backtest-panel.test.js
git commit -m "feat(ui): add historical lookback controls to EmbeddedBacktestPanel"
```

---

### Task 2: Implement Full Daily Time-Series & 15-Year Quant Persona Prompt in `/api/backtest/predict`

**Files:**
- Modify: `src/app/api/backtest/predict/route.js`
- Test: `tests/api/backtest.route.test.js`

**Interfaces:**
- Consumes: `{ symbol, cutoffDate, lookbackDays, predictionDays }` payload from frontend.
- Produces: Formats daily time-series Markdown table with MA5, MA20, MA60, RSI(14), MACD histogram, and invokes Gemini LLM with 15-year quant trader persona.

- [ ] **Step 1: Write test for lookbackDays parameter in `backtest.route.test.js`**

```javascript
// tests/api/backtest.route.test.js
test('POST /api/backtest/predict accepts custom lookbackDays and returns valid forecast', async () => {
  const req = {
    json: async () => ({ symbol: '2330.TW', cutoffDate: '2024-03-01', lookbackDays: 60 })
  };
  const res = await POST(req);
  const data = await res.json();
  expect(data.success).toBe(true);
  expect(data.forecast).toHaveProperty('trend');
});
```

- [ ] **Step 2: Run test to verify**

Run: `npx jest tests/api/backtest.route.test.js`
Expected: PASS or verify behavior with updated predict route.

- [ ] **Step 3: Implement Time-Series Table Generator in `/api/backtest/predict/route.js`**

In `src/app/api/backtest/predict/route.js`:
1. Use `technicalindicators` (SMA, RSI, MACD) to compute daily values for each bar in `pastKlines`.
2. Take the last `lookbackDays` bars leading up to `cutoffDate`.
3. Construct a daily Markdown table:
   ```text
   | 日期 | 開盤價 | 最高價 | 最低價 | 收盤價 | 成交量 | MA5 | MA20 | MA60 | RSI(14) | MACD柱體 |
   ```
4. Inject 15-year senior quantitative trader persona into prompt instructions, directing LLM to observe pattern formations, price-volume relationship, and dynamic momentum.

- [ ] **Step 4: Run test suite to verify**

Run: `npx jest tests/api/backtest.route.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/backtest/predict/route.js tests/api/backtest.route.test.js
git commit -m "feat(api): implement full daily time-series table and 15-year quant persona prompt in predict API"
```
