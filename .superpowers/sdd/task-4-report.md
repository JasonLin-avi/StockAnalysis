# 任務 4：核心分析模組重構報告 (Core Analysis Module Refactoring)

## 1. 實作內容說明 (What we implemented)
- **分析服務層 (`src/services/analysis.service.js`)**：
  - 將原先定義於 `src/lib/integration.js` 的核心整合流程 `performFullAnalysis` 重構並移轉至服務層。
  - 調整並最佳化所有相對路徑引用，包含資料讀取器 (`src/external/data-fetcher`)、資料庫連線及查詢操作 (`src/external/database`) 等。
  - 統一匯出 `performFullAnalysis` 方法，供 API 路由與其他整合模組呼叫。
- **路由處理器重構 (`src/app/api/analyze/route.js`)**：
  - 修改 `analyze` 路由以直接調用新服務層的 `analysis.service.js`。
  - 移除了原先指向 `src/external/database` 和 `src/external/data-fetcher` 的未使用 `require` 敘述，維持檔案的職責單一與乾淨。
- **價格路由處理器重構 (`src/app/api/prices/route.js`)**：
  - 更新在無快取或 backtest 資料不完整時，觸發 performFullAnalysis 的引用，改為使用 `src/services/analysis.service.js`。
- **相容性委派層 (`src/lib/integration.js`)**：
  - 修改 `src/lib/integration.js` 將其重構為簡單的相容性委派層，重新導向並匯出 `src/services/analysis.service.js` 中的 `performFullAnalysis` 方法。此舉維持了對非 API 路由呼叫端（如 `report/route.js`、`leaderboard/route.js` 與 `chatbot/tools.js` 等）的向後相容性。

---

## 2. 測試與驗證結果 (What we tested and test results)
- 撰寫了全新的單元測試檔案 `tests/unit/analysis-service.test.js` 以驗證服務層的正確性。
- **修復單元測試污染與真實 API 呼叫**：
  - 實作了 `yahoo-finance` 外部 API 與 `news-analysis` 的 Mock 機制，防止測試執行時發送真實 HTTP 網路請求與 RSS 解析，確保執行環境為封閉離線狀態。
  - 使用 `connectToDatabase(':memory:')` 於 `beforeEach` Hook 初始化獨立的 SQLite 記憶體資料庫，並在 `afterEach` Hook 中將其關閉，實現資料庫的徹底隔離，防堵本地 `data/stock.db` 資料庫被測試污染。
  - 新增輸入驗證錯誤測試，驗證 `performFullAnalysis` 在輸入為 `null` 或空字串 `""` 時是否確實拋出對應之 `'Symbol is required'` 錯誤。
- 完整執行專案的單元測試套件：
  - 執行指令：`npm test`
  - 測試結果：**39/39 passed, 217/217 total** (單元測試的執行速度因 API 被 Mock 而大幅提速)

---

## 3. TDD 證據 (TDD Evidence)

### RED 階段 (測試失敗)
- **執行指令**：
  ```bash
  npx jest tests/unit/analysis-service.test.js
  ```
- **預期失敗輸出片段**：
  ```text
  FAIL tests/unit/analysis-service.test.js
    ● Test suite failed to run

      Cannot find module '../../src/services/analysis.service' from 'tests/unit/analysis-service.test.js'

      > 1 | const { performFullAnalysis } = require('../../src/services/analysis.service');
          |                                 ^
  ```
- **預期失敗原因**：
  在服務層程式碼 `src/services/analysis.service.js` 尚未建立前，測試模組因載入失敗而報錯，確認測試能夠正確在缺失實作時觸發 RED 狀態。

### GREEN 階段 (測試通過與 Mock 最佳化)
- **執行指令**：
  ```bash
  npx jest tests/unit/analysis-service.test.js
  ```
- **測試通過與效能改善輸出片段**：
  ```text
  PASS tests/unit/analysis-service.test.js
    Analysis Service
      √ should successfully run performFullAnalysis and return correct structure (125 ms)
      √ should throw an error when passed invalid input (null or empty string) (95 ms)

  Test Suites: 1 passed, 1 total
  Tests:       2 passed, 2 total
  Snapshots:   0 total
  Time:        1.797 s, estimated 5 s
  Ran all test suites matching /tests\unit\analysis-service.test.js/i.
  ```

---

## 4. 變更的檔案清單 (Files changed)
- [建立] `src/services/analysis.service.js` (建立核心分析服務層)
- [修改] `src/lib/integration.js` (改為對服務層之相容性委派層)
- [修改] `src/app/api/analyze/route.js` (使用分析服務並清空多餘 require)
- [修改] `src/app/api/prices/route.js` (將 inline require 調整為新服務層)
- [建立] `tests/unit/analysis-service.test.js` (新增單元測試檔案)

---

## 5. 自我審查與疑慮說明 (Self-review & Concerns)
- **自我審查**：
  - 程式碼結構清晰，完美契合規劃的架構分層。
  - 所有註釋皆遵循 Google 工程標準，清晰闡述「為什麼 (Why)」而非僅描述「做什麼 (What)」。
  - 在重構的同時保留了原先的註釋與業務邏輯，維持程式碼的完整性。
- **疑慮/關注事項**：
  - 無，相容性委派層完美消除了對其他子系統/API（如 Chatbot 整合、Leaderboard 等）的潛在破壞。

---

## 6. 架構加強與修復說明 (Architecture Enforcement & Fixes)
- **服務層功能擴充 (`src/services/analysis.service.js`)**：
  - 新增並導出 `getLatestPricesAndBacktest(symbols)` 方法，將原本位於 `api/prices/route.js` 的業務及查詢邏輯內聚至服務層。
  - 包含平行呼叫 `fetchStockData`、資料庫連線、檢查分析結果完整性（`winRate40d`/`winRate240d`）、缺失時觸發 `performFullAnalysis` 以及動態顏色和價格格式化邏輯。
- **價格 API 路由清理 (`src/app/api/prices/route.js`)**：
  - 徹底移除直接對 `yahooFinance`、`connectToDatabase`、`getLatestAnalysisResults` 的依賴。
  - 僅負責路由職責：解析 symbolsStr、正規化輸入陣列、呼叫 `getLatestPricesAndBacktest` 並返回 `NextResponse.json`。
- **測試強化與全域狀態依賴修復 (`tests/unit/analysis-service.test.js`)**：
  - 新增 `getLatestPricesAndBacktest` 的單元測試 coverage，確保回傳的物件格式正確（含正負號、顏色、Horizons 屬性）。
  - 將測試中呼叫的 `performFullAnalysis` 顯式傳入 `db` 參數，避免隱式依賴全域資料庫狀態。
- **測試驗證結果**：
  - 執行指令：`npx jest tests/unit/analysis-service.test.js tests/api/prices.test.js` 與 `npm test`，全部綠燈通過。

---

## 7. 資料庫連線洩漏與 Inline Requires 修復說明 (Database Leakage & Inline Requires Fixes)
- **資料庫連線複用與測試隔離修復 (`src/services/analysis.service.js`)**：
  - 修正了 `getLatestPricesAndBacktest` 方法中直接調用 `await connectToDatabase()` 的問題。改為優先從 `getActiveDatabase()` 獲取當前已啟用的資料庫實例（例如單元測試中 initialized 的 `:memory:` 記憶體資料庫），若無 activeInstance 才透過 `connectToDatabase()` 建立新連線：
    `const activeDb = getActiveDatabase() || await connectToDatabase();`
  - 此修正消除了單元測試期間會意外建立並污染本地實體檔案 `data/stock.db` 的連線洩漏隱患，確保了測試環境的完全隔離。
- **清理 Inline Requires 提升代碼規範**：
  - 將原本散落在 `src/services/analysis.service.js` 內部方法中的多個 inline `require` 語句（包括 `saveStockData`, `saveAnalysisResults`, `getLatestAnalysisResults` 與 `logger`）全部移至檔案最頂端集中引入。
  - 此重構符合標準的導入/引用規範（Import/Require Style Guide），有助於提升程式碼的可讀性與靜態分析效率。
- **測試驗證結果**：
  - 執行指令：`npx jest tests/unit/analysis-service.test.js tests/api/prices.test.js` 與 `npm test`，所有測試皆順利通過，無任何 Regression。
