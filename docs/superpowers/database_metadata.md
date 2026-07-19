# Database Metadata / Schema

This document contains the SQLite database schema used in this project, extracted via `codebase-memory-mcp` and annotated with semantic descriptions based on the codebase logic.

## Schema Definition
Source: `src/lib/database/schema.js`

```sql
  -- ==========================================
  -- Table: stocks
  -- Description: 儲存股票的基本中繼資料 (Metadata)。
  -- 作為主檔 (Master Record)，防止不同表中重複儲存字串，作為其他資料表的關聯核心。
  -- ==========================================
  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 內部關聯使用的唯一主鍵 ID
    symbol TEXT UNIQUE NOT NULL,          -- 股票代號 (例如: AAPL, TSLA)，具備唯一性
    name TEXT,                            -- 股票/企業名稱 (例如: Apple Inc.)
    market TEXT NOT NULL                  -- 所屬交易市場 (例如: US, TW)
  );
  
  -- ==========================================
  -- Table: stock_data
  -- Description: 儲存時間序列的每日歷史股價資料。
  -- 供技術分析模組 (計算 MA, RSI, MACD) 與前端 K 線圖使用。
  -- ==========================================
  CREATE TABLE IF NOT EXISTS stock_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,            -- 外鍵：關聯至 stocks(id)
    date DATE NOT NULL,                   -- 交易日期 (YYYY-MM-DD)
    open REAL NOT NULL,                   -- 開盤價 (使用 REAL 確保技術指標浮點數計算的精準度)
    high REAL NOT NULL,                   -- 最高價
    low REAL NOT NULL,                    -- 最低價
    close REAL NOT NULL,                  -- 收盤價
    volume INTEGER NOT NULL,              -- 總交易量
    UNIQUE(stock_id, date),               -- 確保同一檔股票在同一天只會有一筆價格紀錄 (防止重複插入)
    FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE -- 若主檔股票刪除，同步刪除其歷史資料
  );
  
  -- ==========================================
  -- Table: analysis_results
  -- Description: 系統多因子分析引擎與投資顧問的「歷史分析快取紀錄」。
  -- 將龐大且複雜的分析運算結果打包成 JSON 字串儲存，
  -- 便於日後查詢歷史推薦狀態或回測，避免重複向外部 API (Finnhub, Yahoo) 發送請求。
  -- ==========================================
  CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,            -- 外鍵：關聯至 stocks(id)
    date DATE NOT NULL,                   -- 分析執行的系統日期 (YYYY-MM-DD)
    
    -- 下列欄位皆儲存為「序列化 JSON 字串 (Serialized JSON string)」
    technical TEXT,   -- 儲存技術面模組的運算快照 (包含當時的 RSI 狀態, MA 趨勢, MACD 分數)
    fundamental TEXT, -- 儲存基本面模組的運算快照 (包含當時的 PE 估值, EPS, 營收成長, 負債比的健康度)
    news TEXT,        -- 儲存情緒面模組的運算快照 (包含財經新聞情緒分數、Reddit/X 的社群聲量與正負向情緒)
    advice TEXT,      -- 儲存決策引擎輸出的最終投資建議 (包含 Buy/Sell 動作、信心水準、風險控管等級、資產配置權重)
    
    UNIQUE(stock_id, date),               -- 確保同一檔股票在同一天只會儲存一份最新的分析報告
    FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
  );
```
