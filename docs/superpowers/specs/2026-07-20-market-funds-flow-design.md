# 設計規格書：市場資金流向分析功能 (Market Funds Flow Analysis)

本文件定義「市場資金流向分析」功能的技術架構、資料庫 Schema、API 路由設計以及前端 UI 呈現規格。

---

## 1. 功能需求與場景 (Requirements)

1. **獨立一級頁面**：在系統導覽列中，與「市場看板」、「量化戰情室」處於同一層級，擁有獨立路由 `/funds-flow`。
2. **多市場支援**：支援台股與美股市場的資金流向切換。
3. **日期歷史查詢**：使用者可選擇過去一個月內（30天）的任意日期作為分析基準日。
4. **LLM 網路搜尋分析**：系統利用 Gemini API 內建的 Google Search 網路搜尋功能，針對特定日期與市場，搜尋過去一個月內的市場資金動向、板塊強弱與法人買賣超資訊，並產出分析報告。
5. **高效快取機制**：為避免重複且昂貴的 Gemini + Search API 調用，已分析過的日期與市場數據將永久緩存至 SQLite 資料庫。若使用者查詢已分析過的日期，直接從資料庫讀取並呈現。

---

## 2. 資料庫設計 (Database Schema)

在 SQLite 中新增 `market_funds_flow` 資料表：

```sql
CREATE TABLE IF NOT EXISTS market_funds_flow (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market TEXT NOT NULL,          -- 'US' 或 'TW'
  date DATE NOT NULL,            -- 分析基準日 (YYYY-MM-DD)
  prompt TEXT NOT NULL,          -- 呼叫時使用的 Prompt 內容 (用於 Prompt 版本更新時使快取失效)
  content TEXT NOT NULL,         -- Gemini 回傳的 Markdown 文字內容
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(market, date)
);
```

---

## 3. API 路由設計 (API Endpoints)

### 3.1 取得/產生資金流向分析
* **網址**：`/api/market/funds-flow`
* **方法**：`POST` 或 `GET`
* **參數**：
  * `market`: `'US'` 或 `'TW'`
  * `date`: `YYYY-MM-DD`（預設為今天）
* **內部邏輯**：
  1. 連接資料庫，查詢是否存在滿足 `market` 且 `date` 的記錄。
  2. 若快取存在，且資料庫中的 `prompt` 與當前系統設定的基礎 Prompt 一致，則直接回傳快取內容。
  3. 若快取不存在，載入基礎 Prompt，將 `{market}`（置換為「美股」或「台股」）與 `{date}`（置換為指定日期）替換。
  4. 調用 Gemini API，並開啟 `googleSearch` 工具。
  5. 取得 Markdown 結果後，將 `market`, `date`, `prompt`, `content` 寫入 `market_funds_flow` 資料表。
  6. 回傳結果 JSON：`{ "market": "US", "date": "2026-07-20", "content": "Markdown文字..." }`。

---

## 4. 前端介面與路由 (Frontend UI & Routes)

### 4.1 頁面路徑
* 前端新增頁面：`src/app/funds-flow/page.js`。

### 4.2 介面設計規格
1. **頂部導覽控制列**：
   * 市場切換按鈕組 (ButtonGroup)：`美股資金流向` / `台股資金流向`。
   * 日期選擇器 (Date Picker)：限制可選區間為 `[今天 - 30天, 今天]`。
2. **分析報告卡片**：
   * 使用 Glassmorphism 半透明卡片作為容器（與量化戰情室視覺風格一致）。
   * 使用 `react-markdown` 組件動態解析 Gemini 回傳的 Markdown 語法，渲染標題、粗體、清單、表格。
   * 針對 Markdown 中的 Table 實施自訂 CSS 樣式，使其符合平台的暗色調科技感設計（細邊框、交替背景色、Cyan 強調色）。
3. **加載狀態 (Loading Indicator)**：
   * 當第一次觸發 LLM 搜尋分析時，由於 Gemini 搜尋需要數秒時間，畫面應顯示具有科技感的骨架屏 (Skeleton Screen) 與「AI 正在檢索市場大數據並進行深度量化分析中...」的提示動畫。

---

## 5. 基礎 Prompt 範本規格 (Base Prompt Template)

系統將定義一組基礎 Prompt，並於執行時動態替換日期與市場：
> 「你是一個專業的量化金融分析師。請利用 Google Search 網路搜尋功能，檢索並分析在 {date} 之前一個月內，{market} 市場的資金流動狀況。
> 請特別關注：
> 1. 資金主要流入與流出的板塊、行業或主要大型個股，尤其是這段時間內表現最為突出的幾隻科技股以及他們的資金流向的情況。
> 2. 三大法人（若為台股）或機構資金（若為美股）的最新主要動態。
> 3. 當前市場的熱點主題與板塊（特別是科技板塊）的輪動趨勢與資金流向數據。
> 
> 請直接以精簡、專業的 Markdown 格式輸出你的分析報告，包含小標題、重點清單或比對表格，不要包含任何開場白或無關的贅詞。」
