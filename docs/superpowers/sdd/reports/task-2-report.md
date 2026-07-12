# Task 2 Report - 數據獲取模組實現

## Status: DONE

## 實現內容

### 1. Yahoo Finance 模組 (`src/lib/data-fetcher/yahoo-finance.js`)
- **`fetchStockData(symbol)`** - 從 Yahoo Finance 的 `query1.finance.yahoo.com/v8/finance/chart/{symbol}` API 獲取當前股價資料
- **`fetchHistoricalData(symbol, period)`** - 從同一端點獲取歷史股價資料，支援多種時間範圍 (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max)
- 自動從 meta 和 indicators 中提取資料，處理缺失欄位的 fallback

### 2. Google Finance 模組 (`src/lib/data-fetcher/google-finance.js`)
- **`fetchStockData(symbol)`** - 從 `finance.google.com/finance/info?client=ig&q={symbol}` API 獲取當前資料，處理 `// ` JSON 前綴
- **`fetchHistoricalData(symbol, period)`** - 從 `finance.google.com/finance/getprices` CSV 端點獲取歷史資料，解析時間戳偏移格式
- 對 Google Finance 傳回的數值欄位進行嚴謹的型別轉換

### 3. 統一模組 (`src/lib/data-fetcher/index.js`)
- **`fetchStockData(symbol)`** - 以 Yahoo Finance 為主，失敗時自動切換至 Google Finance
- **`fetchHistoricalData(symbol, period)`** - 同樣的 fallback 模式
- 兩種函式皆傳回標準化格式

### 4. 單元測試 (`tests/unit/data-fetcher.test.js`)
- 11 個測試案例，全部通過
- 使用 `jest.fn()` mock `global.fetch`
- 測試涵蓋：
  - 標準化輸出格式驗證（所有欄位）
  - Yahoo 成功時僅呼叫 Yahoo
  - Yahoo 失敗時自動 fallback 至 Google
  - 兩個來源都失敗時拋出錯誤
  - 異常回應處理（空結果、無效 JSON）
  - changePercent 計算正確性
  - 歷史資料預設 period 為 1mo

### 5. 基礎設施
- 建立 `src/app/layout.js` 和 `src/app/page.js`（供 next/jest 測試執行器使用）

### 6. 依賴
- 使用 Node 18 內建 `global.fetch`，無需額外安裝 node-fetch
- 僅透過 `npm install` 安裝既有 package.json 中的依賴

## 測試結果

```
PASS tests/unit/data-fetcher.test.js
  Data Fetcher Module
    fetchStockData
      √ returns standardized format from Yahoo Finance (primary source)
      √ falls back to Google Finance when Yahoo fails
      √ throws error when both sources fail
      √ handles malformed Yahoo response (empty result)
      √ handles malformed Google response (invalid JSON)
      √ computed changePercent is correct
    fetchHistoricalData
      √ returns standardized format from Yahoo Finance
      √ falls back to Google Finance when Yahoo fails
      √ throws error when both sources fail
      √ defaults period to 1mo
      √ handles empty data from Yahoo with fallback also failing

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

## 變更檔案

| 檔案 | 路徑 | 說明 |
|------|------|------|
| yahoo-finance.js | `src/lib/data-fetcher/yahoo-finance.js` | Yahoo Finance 資料獲取模組 |
| google-finance.js | `src/lib/data-fetcher/google-finance.js` | Google Finance 資料獲取模組 |
| index.js | `src/lib/data-fetcher/index.js` | 統一模組（含 fallback 邏輯） |
| data-fetcher.test.js | `tests/unit/data-fetcher.test.js` | 單元測試（11 cases） |
| layout.js | `src/app/layout.js` | Next.js App Router 佈局（測試基礎設施） |
| page.js | `src/app/page.js` | Next.js 首頁（測試基礎設施） |

## 注意事項

1. **Google Finance API 可靠性**：Google Finance 的 `/info` 和 `/getprices` 端點屬於非官方介面，可能隨時變更或關閉。實作中已加入完善的錯誤處理。

2. **CORS 限制**：前端瀏覽器環境中直接呼叫這些 API 可能遇到 CORS 問題。目前實作用於後端/伺服器端環境（Node.js），無此限制。

3. **`src/app/` 基礎設施**：為讓 `next/jest` 執行測試，需要 `app` 或 `pages` 目錄。已建立最簡實作，未來正式開發時需擴充。

4. **CRLF 警告**：Windows 環境的正常現象，不影響功能。

**Status:** DONE
**Commits:** 85b71f0
**Tests:** 11/11 passed
