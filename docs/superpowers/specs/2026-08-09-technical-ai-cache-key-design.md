# Design Document: 15-Year Senior Quant Expert AI Diagnosis SQLite Caching

## Problem Statement
The 15-year senior quantitative expert AI technical diagnosis functionality calls the Gemini LLM API (with Search Grounding) for a given stock symbol and reference days (e.g., 15, 30, 60 days). Without precise caching based on historical daily data updates, users requesting diagnosis for the same stock and reference days on the same trading day might trigger repetitive Gemini API calls.

## Proposed Solution
Enhance the caching layer in SQLite `stock_prompt_analysis` table by incorporating:
1. **Stock Symbol** (`symbol`)
2. **Reference Days** (`days`, e.g., 15, 30, 60) in the cache key format `${UPPER_SYMBOL}_technical_ai_${days}`
3. **Database Latest Price Date** (`max_date`, YYYY-MM-DD) from `stock_data` table instead of current UTC/local system date.

### Workflow & Logic
1. **Incremental Price Sync**: Sync stock data to database so `stock_data` contains up-to-date prices.
2. **Fetch `max_date`**: Query `getMaxPriceDate(db, stockId)` to obtain the latest trading date present in the DB for the target stock.
3. **Cache Lookup**: Query `stock_prompt_analysis` with:
   - `symbol` = `${UPPER_SYMBOL}_technical_ai_${days}`
   - `analysis_type` = `'technical'`
   - `date` = `max_date`
4. **Cache Hit**: Immediately return cached markdown report.
5. **Cache Miss**:
   - Calculate indicators & time-series markdown table for the given `days`.
   - Call Gemini LLM (`callGemini`).
   - Save result into `stock_prompt_analysis` using `max_date` as the date record key.

## Key Changes
- `src/app/api/stock/[symbol]/technical-ai/route.js`: Update cache lookup and save logic to resolve `stockId` & `max_date` prior to `getPromptAnalysis`.
- `tests/unit/technical-ai-api.test.js`: Update test cases to mock `getMaxPriceDate` and assert caching works with DB latest trading dates.

## Testing & Verification Strategy
- Run `npm test tests/unit/technical-ai-api.test.js` to ensure all scenarios pass cleanly.
