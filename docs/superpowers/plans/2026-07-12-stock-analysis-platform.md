# 股市分析平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個網頁應用，整合台灣和美國股市數據，提供技術分析、基本面分析、新聞情緒分析，並生成投資建議

**Architecture:** 使用Next.js構建全棧應用，整合多個數據源，實現模組化的分析引擎和可視化界面

**Tech Stack:** Next.js, Docker, 本地數據庫, 圖表庫

## Global Constraints

- 支持台灣與美國市場
- 包含技術分析指標：MA, RSI, MACD
- 包含基本面分析要素：市盈率, EPS, 負債比率, 營收成長, 現金流量
- 包含新聞分析：財經新聞, 社交情緒, 重大事件
- 提供投資建議：投資組合建議與買入賣出建議與風險管理
- 平台形式：網頁應用
- 數據更新：手動更新
- 用戶界面：可自定義
- 數據存儲：本地數據庫, 報告文件
- 開發技術：Next.js處理前後端
- 部署方式：Docker
- 用戶認證：暫時無需認證，但保留擴展說明
- 數據可視化：圖表庫
- 報告生成：HTML報告

---

### Task 1: 專案初始化和Docker配置

**Files:**
- Create: `package.json`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.gitignore`

**Interfaces:**
- Consumes: N/A
- Produces: 可運行的Next.js應用容器環境

- [ ] **Step 1: 初始化Next.js專案**

創建基本的Next.js應用結構

- [ ] **Step 2: 創建Docker配置文件**

創建Dockerfile和docker-compose.yml以支持容器化部署

- [ ] **Step 3: 配置.gitignore**

添加適當的忽略規則

- [ ] **Step 4: Commit**

```bash
git init
git add package.json Dockerfile docker-compose.yml .gitignore
git commit -m "feat: 初始化專案和Docker配置"
```

### Task 2: 數據獲取模組實現

**Files:**
- Create: `src/lib/data-fetcher/yahoo-finance.js`
- Create: `src/lib/data-fetcher/google-finance.js`
- Create: `src/lib/data-fetcher/index.js`
- Test: `tests/unit/data-fetcher.test.js`

**Interfaces:**
- Consumes: Yahoo Finance API, Google Finance API
- Produces: 標準化數據格式供分析模組使用

- [ ] **Step 1: 實現Yahoo Finance數據獲取**

```javascript
// src/lib/data-fetcher/yahoo-finance.js
export async function fetchStockData(symbol) {
  // 實現獲取股票數據的邏輯
  return data;
}

export async function fetchHistoricalData(symbol, period) {
  // 實現獲取歷史數據的邏輯
  return data;
}
```

- [ ] **Step 2: 實現Google Finance數據獲取**

```javascript
// src/lib/data-fetcher/google-finance.js
export async function fetchStockData(symbol) {
  // 實現獲取股票數據的邏輯
  return data;
}

export async function fetchHistoricalData(symbol, period) {
  // 實現獲取歷史數據的邏輯
  return data;
}
```

- [ ] **Step 3: 整合數據源**

```javascript
// src/lib/data-fetcher/index.js
import * as yahooFinance from './yahoo-finance';
import * as googleFinance from './google-finance';

export async function fetchStockData(symbol) {
  // 整合多個數據源
  const yahooData = await yahooFinance.fetchStockData(symbol);
  const googleData = await googleFinance.fetchStockData(symbol);
  
  // 合併數據並返回標準化格式
  return combinedData;
}
```

- [ ] **Step 4: 實現測試**

```javascript
// tests/unit/data-fetcher.test.js
import { fetchStockData } from '../../src/lib/data-fetcher';

describe('Data Fetcher', () => {
  test('should fetch stock data from multiple sources', async () => {
    const data = await fetchStockData('TSLA');
    expect(data).toHaveProperty('price');
    expect(data).toHaveProperty('volume');
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-fetcher tests/unit/data-fetcher.test.js
git commit -m "feat: 實現數據獲取模組"
```

### Task 3: 技術分析引擎實現

**Files:**
- Create: `src/lib/technical-analysis/ma.js`
- Create: `src/lib/technical-analysis/rsi.js`
- Create: `src/lib/technical-analysis/macd.js`
- Create: `src/lib/technical-analysis/index.js`
- Test: `tests/unit/technical-analysis.test.js`

**Interfaces:**
- Consumes: 歷史股價數據
- Produces: 技術指標計算結果

- [ ] **Step 1: 實現移動平均線(MA)計算**

```javascript
// src/lib/technical-analysis/ma.js
export function calculateMA(prices, period) {
  // 實現MA計算邏輯
  return maValues;
}
```

- [ ] **Step 2: 實現相對強弱指標(RSI)計算**

```javascript
// src/lib/technical-analysis/rsi.js
export function calculateRSI(prices, period) {
  // 實現RSI計算邏輯
  return rsiValues;
}
```

- [ ] **Step 3: 實現MACD指標計算**

```javascript
// src/lib/technical-analysis/macd.js
export function calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod) {
  // 實現MACD計算邏輯
  return { macdLine, signalLine, histogram };
}
```

- [ ] **Step 4: 整合技術分析模組**

```javascript
// src/lib/technical-analysis/index.js
import { calculateMA } from './ma';
import { calculateRSI } from './rsi';
import { calculateMACD } from './macd';

export function performTechnicalAnalysis(historicalData) {
  // 執行所有技術分析
  const ma = calculateMA(historicalData.prices, 20);
  const rsi = calculateRSI(historicalData.prices, 14);
  const macd = calculateMACD(historicalData.prices, 12, 26, 9);
  
  return { ma, rsi, macd };
}
```

- [ ] **Step 5: 實現測試**

```javascript
// tests/unit/technical-analysis.test.js
import { performTechnicalAnalysis } from '../../src/lib/technical-analysis';

describe('Technical Analysis', () => {
  test('should calculate all technical indicators', () => {
    const testData = { prices: [100, 101, 102, 103, 104] };
    const result = performTechnicalAnalysis(testData);
    
    expect(result).toHaveProperty('ma');
    expect(result).toHaveProperty('rsi');
    expect(result).toHaveProperty('macd');
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/technical-analysis tests/unit/technical-analysis.test.js
git commit -m "feat: 實現技術分析引擎"
```

### Task 4: 基本面分析模組實現

**Files:**
- Create: `src/lib/fundamental-analysis/pe-ratio.js`
- Create: `src/lib/fundamental-analysis/eps.js`
- Create: `src/lib/fundamental-analysis/debt-ratio.js`
- Create: `src/lib/fundamental-analysis/revenue-growth.js`
- Create: `src/lib/fundamental-analysis/cash-flow.js`
- Create: `src/lib/fundamental-analysis/index.js`
- Test: `tests/unit/fundamental-analysis.test.js`

**Interfaces:**
- Consumes: 財務數據
- Produces: 基本面分析結果

- [ ] **Step 1: 實現市盈率(P/E Ratio)分析**

```javascript
// src/lib/fundamental-analysis/pe-ratio.js
export function analyzePERatio(stockData) {
  // 實現市盈率分析邏輯
  return peAnalysis;
}
```

- [ ] **Step 2: 實現每股收益(EPS)分析**

```javascript
// src/lib/fundamental-analysis/eps.js
export function analyzeEPS(stockData) {
  // 實現EPS分析邏輯
  return epsAnalysis;
}
```

- [ ] **Step 3: 實現負債比率分析**

```javascript
// src/lib/fundamental-analysis/debt-ratio.js
export function analyzeDebtRatio(stockData) {
  // 實現負債比率分析邏輯
  return debtRatioAnalysis;
}
```

- [ ] **Step 4: 實現營收成長率分析**

```javascript
// src/lib/fundamental-analysis/revenue-growth.js
export function analyzeRevenueGrowth(stockData) {
  // 實現營收成長率分析邏輯
  return revenueGrowthAnalysis;
}
```

- [ ] **Step 5: 實現現金流量分析**

```javascript
// src/lib/fundamental-analysis/cash-flow.js
export function analyzeCashFlow(stockData) {
  // 實現現金流量分析邏輯
  return cashFlowAnalysis;
}
```

- [ ] **Step 6: 整合基本面分析模組**

```javascript
// src/lib/fundamental-analysis/index.js
import { analyzePERatio } from './pe-ratio';
import { analyzeEPS } from './eps';
import { analyzeDebtRatio } from './debt-ratio';
import { analyzeRevenueGrowth } from './revenue-growth';
import { analyzeCashFlow } from './cash-flow';

export function performFundamentalAnalysis(stockData) {
  // 執行所有基本面分析
  const pe = analyzePERatio(stockData);
  const eps = analyzeEPS(stockData);
  const debtRatio = analyzeDebtRatio(stockData);
  const revenueGrowth = analyzeRevenueGrowth(stockData);
  const cashFlow = analyzeCashFlow(stockData);
  
  return { pe, eps, debtRatio, revenueGrowth, cashFlow };
}
```

- [ ] **Step 7: 實現測試**

```javascript
// tests/unit/fundamental-analysis.test.js
import { performFundamentalAnalysis } from '../../src/lib/fundamental-analysis';

describe('Fundamental Analysis', () => {
  test('should perform all fundamental analysis', () => {
    const testData = { /* 測試數據 */ };
    const result = performFundamentalAnalysis(testData);
    
    expect(result).toHaveProperty('pe');
    expect(result).toHaveProperty('eps');
    expect(result).toHaveProperty('debtRatio');
    expect(result).toHaveProperty('revenueGrowth');
    expect(result).toHaveProperty('cashFlow');
  });
});
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/fundamental-analysis tests/unit/fundamental-analysis.test.js
git commit -m "feat: 實現基本面分析模組"
```

### Task 5: 新聞和社交情緒分析模組

**Files:**
- Create: `src/lib/news-analysis/financial-news.js`
- Create: `src/lib/news-analysis/social-sentiment.js`
- Create: `src/lib/news-analysis/major-events.js`
- Create: `src/lib/news-analysis/index.js`
- Test: `tests/unit/news-analysis.test.js`

**Interfaces:**
- Consumes: 新聞API、社交媒體API
- Produces: 情緒分析結果和事件影響評估

- [ ] **Step 1: 實現財經新聞分析**

```javascript
// src/lib/news-analysis/financial-news.js
export async function analyzeFinancialNews(symbol) {
  // 實現財經新聞分析邏輯
  return newsAnalysis;
}
```

- [ ] **Step 2: 實現社交情緒分析**

```javascript
// src/lib/news-analysis/social-sentiment.js
export async function analyzeSocialSentiment(symbol) {
  // 實現社交情緒分析邏輯
  return sentimentAnalysis;
}
```

- [ ] **Step 3: 實現重大事件分析**

```javascript
// src/lib/news-analysis/major-events.js
export async function analyzeMajorEvents(symbol) {
  // 實現重大事件分析邏輯
  return eventsAnalysis;
}
```

- [ ] **Step 4: 整合新聞分析模組**

```javascript
// src/lib/news-analysis/index.js
import { analyzeFinancialNews } from './financial-news';
import { analyzeSocialSentiment } from './social-sentiment';
import { analyzeMajorEvents } from './major-events';

export async function performNewsAnalysis(symbol) {
  // 執行所有新聞分析
  const financialNews = await analyzeFinancialNews(symbol);
  const socialSentiment = await analyzeSocialSentiment(symbol);
  const majorEvents = await analyzeMajorEvents(symbol);
  
  return { financialNews, socialSentiment, majorEvents };
}
```

- [ ] **Step 5: 實現測試**

```javascript
// tests/unit/news-analysis.test.js
import { performNewsAnalysis } from '../../src/lib/news-analysis';

describe('News Analysis', () => {
  test('should perform all news analysis', async () => {
    const result = await performNewsAnalysis('TSLA');
    
    expect(result).toHaveProperty('financialNews');
    expect(result).toHaveProperty('socialSentiment');
    expect(result).toHaveProperty('majorEvents');
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/news-analysis tests/unit/news-analysis.test.js
git commit -m "feat: 實現新聞和社交情緒分析模組"
```

### Task 6: 投資建議引擎

**Files:**
- Create: `src/lib/investment-advisor/portfolio.js`
- Create: `src/lib/investment-advisor/buy-sell.js`
- Create: `src/lib/investment-advisor/risk-management.js`
- Create: `src/lib/investment-advisor/index.js`
- Test: `tests/unit/investment-advisor.test.js`

**Interfaces:**
- Consumes: 技術分析、基本面分析、新聞分析結果
- Produces: 投資建議和風險評估

- [ ] **Step 1: 實現投資組合建議**

```javascript
// src/lib/investment-advisor/portfolio.js
export function generatePortfolioAdvice(analysisResults) {
  // 實現投資組合建議邏輯
  return portfolioAdvice;
}
```

- [ ] **Step 2: 實現買入/賣出建議**

```javascript
// src/lib/investment-advisor/buy-sell.js
export function generateBuySellAdvice(analysisResults) {
  // 實現買入/賣出建議邏輯
  return buySellAdvice;
}
```

- [ ] **Step 3: 實現風險管理建議**

```javascript
// src/lib/investment-advisor/risk-management.js
export function generateRiskManagementAdvice(analysisResults) {
  // 實現風險管理建議邏輯
  return riskAdvice;
}
```

- [ ] **Step 4: 整合投資建議引擎**

```javascript
// src/lib/investment-advisor/index.js
import { generatePortfolioAdvice } from './portfolio';
import { generateBuySellAdvice } from './buy-sell';
import { generateRiskManagementAdvice } from './risk-management';

export function generateInvestmentAdvice(analysisResults) {
  // 生成綜合投資建議
  const portfolio = generatePortfolioAdvice(analysisResults);
  const buySell = generateBuySellAdvice(analysisResults);
  const risk = generateRiskManagementAdvice(analysisResults);
  
  return { portfolio, buySell, risk };
}
```

- [ ] **Step 5: 實現測試**

```javascript
// tests/unit/investment-advisor.test.js
import { generateInvestmentAdvice } from '../../src/lib/investment-advisor';

describe('Investment Advisor', () => {
  test('should generate comprehensive investment advice', () => {
    const testData = { /* 測試數據 */ };
    const result = generateInvestmentAdvice(testData);
    
    expect(result).toHaveProperty('portfolio');
    expect(result).toHaveProperty('buySell');
    expect(result).toHaveProperty('risk');
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/investment-advisor tests/unit/investment-advisor.test.js
git commit -m "feat: 實現投資建議引擎"
```

### Task 7: 數據庫設計和實現

**Files:**
- Create: `src/lib/database/schema.js`
- Create: `src/lib/database/connection.js`
- Create: `src/lib/database/queries.js`
- Test: `tests/unit/database.test.js`

**Interfaces:**
- Consumes: 所有分析結果和用戶數據
- Produces: 持久化存儲功能

- [ ] **Step 1: 設計數據庫模式**

```javascript
// src/lib/database/schema.js
export const schema = `
  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE,
    name TEXT,
    market TEXT
  );
  
  CREATE TABLE IF NOT EXISTS stock_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER,
    date DATE,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    FOREIGN KEY (stock_id) REFERENCES stocks (id)
  );
  
  CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER,
    date DATE,
    technical JSON,
    fundamental JSON,
    news JSON,
    advice JSON,
    FOREIGN KEY (stock_id) REFERENCES stocks (id)
  );
`;
```

- [ ] **Step 2: 實現數據庫連接**

```javascript
// src/lib/database/connection.js
import sqlite3 from 'sqlite3';

export function connectToDatabase() {
  // 實現數據庫連接邏輯
  return db;
}
```

- [ ] **Step 3: 實現數據庫查詢功能**

```javascript
// src/lib/database/queries.js
export async function saveStockData(db, stockData) {
  // 實現保存股票數據的邏輯
}

export async function getStockData(db, symbol) {
  // 實現獲取股票數據的邏輯
}

export async function saveAnalysisResults(db, analysisResults) {
  // 實現保存分析結果的邏輯
}
```

- [ ] **Step 4: 實現測試**

```javascript
// tests/unit/database.test.js
import { connectToDatabase, saveStockData } from '../../src/lib/database';

describe('Database', () => {
  test('should connect to database and save data', async () => {
    const db = connectToDatabase();
    const result = await saveStockData(db, testData);
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/database tests/unit/database.test.js
git commit -m "feat: 實現數據庫設計和實現"
```

### Task 8: 數據可視化組件

**Files:**
- Create: `src/components/ChartContainer.js`
- Create: `src/components/TechnicalIndicatorsChart.js`
- Create: `src/components/FundamentalAnalysisChart.js`
- Create: `src/components/NewsSentimentChart.js`
- Create: `src/components/InvestmentAdvicePanel.js`
- Test: `tests/unit/components.test.js`

**Interfaces:**
- Consumes: 分析結果和股票數據
- Produces: 圖表和可視化組件

- [ ] **Step 1: 創建圖表容器組件**

```javascript
// src/components/ChartContainer.js
export default function ChartContainer({ children, title }) {
  return (
    <div className="chart-container">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 實現技術指標圖表組件**

```javascript
// src/components/TechnicalIndicatorsChart.js
import ChartContainer from './ChartContainer';

export default function TechnicalIndicatorsChart({ data }) {
  return (
    <ChartContainer title="技術指標">
      {/* 實現圖表渲染邏輯 */}
    </ChartContainer>
  );
}
```

- [ ] **Step 3: 實現基本面分析圖表組件**

```javascript
// src/components/FundamentalAnalysisChart.js
import ChartContainer from './ChartContainer';

export default function FundamentalAnalysisChart({ data }) {
  return (
    <ChartContainer title="基本面分析">
      {/* 實現圖表渲染邏輯 */}
    </ChartContainer>
  );
}
```

- [ ] **Step 4: 實現新聞情緒圖表組件**

```javascript
// src/components/NewsSentimentChart.js
import ChartContainer from './ChartContainer';

export default function NewsSentimentChart({ data }) {
  return (
    <ChartContainer title="新聞情緒分析">
      {/* 實現圖表渲染邏輯 */}
    </ChartContainer>
  );
}
```

- [ ] **Step 5: 實現投資建議面板組件**

```javascript
// src/components/InvestmentAdvicePanel.js
export default function InvestmentAdvicePanel({ advice }) {
  return (
    <div className="advice-panel">
      <h3>投資建議</h3>
      {/* 實現建議顯示邏輯 */}
    </div>
  );
}
```

- [ ] **Step 6: 實現測試**

```javascript
// tests/unit/components.test.js
import { render } from '@testing-library/react';
import ChartContainer from '../../src/components/ChartContainer';

describe('Components', () => {
  test('should render chart container with title', () => {
    const { getByText } = render(
      <ChartContainer title="測試圖表">內容</ChartContainer>
    );
    expect(getByText('測試圖表')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add src/components tests/unit/components.test.js
git commit -m "feat: 實現數據可視化組件"
```

### Task 9: 報告生成模組

**Files:**
- Create: `src/lib/report-generator/html-report.js`
- Create: `src/lib/report-generator/template.js`
- Create: `src/lib/report-generator/index.js`
- Test: `tests/unit/report-generator.test.js`

**Interfaces:**
- Consumes: 所有分析結果
- Produces: HTML格式報告文件

- [ ] **Step 1: 創建報告模板**

```javascript
// src/lib/report-generator/template.js
export const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>股票分析報告</title>
    <style>
        /* 樣式定義 */
    </style>
</head>
<body>
    <div id="report">
        <h1>股票分析報告</h1>
        <div id="content">
            <!-- 動態內容 -->
        </div>
    </div>
</body>
</html>
`;
```

- [ ] **Step 2: 實現HTML報告生成器**

```javascript
// src/lib/report-generator/html-report.js
export function generateHTMLReport(analysisData) {
  // 實現HTML報告生成邏輯
  return htmlContent;
}
```

- [ ] **Step 3: 整合報告生成模組**

```javascript
// src/lib/report-generator/index.js
import { htmlTemplate } from './template';
import { generateHTMLReport } from './html-report';

export async function generateReport(analysisData, format = 'html') {
  if (format === 'html') {
    return generateHTMLReport(analysisData);
  }
  // 其他格式處理
}
```

- [ ] **Step 4: 實現測試**

```javascript
// tests/unit/report-generator.test.js
import { generateReport } from '../../src/lib/report-generator';

describe('Report Generator', () => {
  test('should generate HTML report', async () => {
    const testData = { /* 測試數據 */ };
    const report = await generateReport(testData, 'html');
    expect(report).toContain('<html>');
    expect(report).toContain('股票分析報告');
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/report-generator tests/unit/report-generator.test.js
git commit -m "feat: 實現報告生成模組"
```

### Task 10: 主頁面和路由實現

**Files:**
- Create: `src/pages/index.js`
- Create: `src/pages/stock/[symbol].js`
- Create: `src/pages/report.js`
- Create: `src/components/Header.js`
- Create: `src/components/SearchBar.js`
- Test: `tests/integration/pages.test.js`

**Interfaces:**
- Consumes: 所有組件和模組
- Produces: 完整的用戶界面

- [ ] **Step 1: 實現主頁面**

```javascript
// src/pages/index.js
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';

export default function Home() {
  return (
    <div>
      <Header />
      <main>
        <SearchBar />
        <div className="dashboard">
          {/* 儀表板內容 */}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 實現股票詳情頁面**

```javascript
// src/pages/stock/[symbol].js
import { useRouter } from 'next/router';
import TechnicalIndicatorsChart from '../../components/TechnicalIndicatorsChart';
import FundamentalAnalysisChart from '../../components/FundamentalAnalysisChart';
import NewsSentimentChart from '../../components/NewsSentimentChart';
import InvestmentAdvicePanel from '../../components/InvestmentAdvicePanel';

export default function StockDetail() {
  const router = useRouter();
  const { symbol } = router.query;
  
  return (
    <div>
      <h1>{symbol} 詳細分析</h1>
      <TechnicalIndicatorsChart />
      <FundamentalAnalysisChart />
      <NewsSentimentChart />
      <InvestmentAdvicePanel />
    </div>
  );
}
```

- [ ] **Step 3: 實現報告頁面**

```javascript
// src/pages/report.js
export default function Report() {
  return (
    <div>
      <h1>分析報告</h1>
      <div id="report-container">
        {/* 報告內容 */}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 實現導航組件**

```javascript
// src/components/Header.js
import Link from 'next/link';

export default function Header() {
  return (
    <header>
      <nav>
        <Link href="/">首頁</Link>
        <Link href="/report">報告</Link>
      </nav>
    </header>
  );
}
```

- [ ] **Step 5: 實現搜索組件**

```javascript
// src/components/SearchBar.js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  
  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/stock/${query}`);
  };
  
  return (
    <form onSubmit={handleSearch}>
      <input 
        type="text" 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        placeholder="輸入股票代碼"
      />
      <button type="submit">搜索</button>
    </form>
  );
}
```

- [ ] **Step 6: 實現測試**

```javascript
// tests/integration/pages.test.js
import { render, screen } from '@testing-library/react';
import Home from '../../src/pages/index';

describe('Pages', () => {
  test('should render home page with search bar', () => {
    render(<Home />);
    expect(screen.getByPlaceholderText('輸入股票代碼')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add src/pages src/components tests/integration/pages.test.js
git commit -m "feat: 實現主頁面和路由"
```

### Task 11: 整合所有模組和API端點

**Files:**
- Create: `src/pages/api/analyze.js`
- Create: `src/pages/api/report.js`
- Create: `src/lib/integration.js`
- Test: `tests/integration/api.test.js`

**Interfaces:**
- Consumes: 所有模組
- Produces: API端點和整合功能

- [ ] **Step 1: 實現分析API端點**

```javascript
// src/pages/api/analyze.js
import { performFullAnalysis } from '../../lib/integration';

export default async function handler(req, res) {
  const { symbol } = req.query;
  
  try {
    const analysisResults = await performFullAnalysis(symbol);
    res.status(200).json(analysisResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

- [ ] **Step 2: 實現報告API端點**

```javascript
// src/pages/api/report.js
import { generateReport } from '../../lib/report-generator';

export default async function handler(req, res) {
  const { symbol } = req.query;
  
  try {
    const report = await generateReport(symbol);
    res.status(200).json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

- [ ] **Step 3: 實現整合邏輯**

```javascript
// src/lib/integration.js
import { fetchStockData } from './data-fetcher';
import { performTechnicalAnalysis } from './technical-analysis';
import { performFundamentalAnalysis } from './fundamental-analysis';
import { performNewsAnalysis } from './news-analysis';
import { generateInvestmentAdvice } from './investment-advisor';

export async function performFullAnalysis(symbol) {
  // 整合所有分析模組
  const stockData = await fetchStockData(symbol);
  const technical = performTechnicalAnalysis(stockData.historical);
  const fundamental = performFundamentalAnalysis(stockData.fundamental);
  const news = await performNewsAnalysis(symbol);
  
  const analysisResults = {
    symbol,
    technical,
    fundamental,
    news,
  };
  
  const advice = generateInvestmentAdvice(analysisResults);
  
  return {
    ...analysisResults,
    advice,
  };
}
```

- [ ] **Step 4: 實現測試**

```javascript
// tests/integration/api.test.js
import { createMocks } from 'node-mocks-http';
import handler from '../../src/pages/api/analyze';

describe('API Integration', () => {
  test('should analyze stock and return results', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        symbol: 'TSLA',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveProperty('symbol');
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/api src/lib/integration tests/integration/api.test.js
git commit -m "feat: 整合所有模組和API端點"
```

### Task 12: 用戶界面優化和自定義功能

**Files:**
- Create: `src/styles/globals.css`
- Create: `src/components/Dashboard.js`
- Create: `src/components/CustomizableLayout.js`
- Create: `src/lib/user-preferences.js`
- Test: `tests/ui/customization.test.js`

**Interfaces:**
- Consumes: 所有組件
- Produces: 可自定義的用戶界面

- [ ] **Step 1: 實現全局樣式**

```css
/* src/styles/globals.css */
:root {
  --primary-color: #0070f3;
  --secondary-color: #3291ff;
  --background-color: #ffffff;
  --text-color: #000000;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
}

.chart-container {
  border: 1px solid #eaeaea;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.advice-panel {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}
```

- [ ] **Step 2: 實現儀表板組件**

```javascript
// src/components/Dashboard.js
export default function Dashboard({ widgets }) {
  return (
    <div className="dashboard">
      {widgets.map((widget, index) => (
        <div key={index} className="widget">
          {widget}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 實現可自定義佈局組件**

```javascript
// src/components/CustomizableLayout.js
import { useState, useEffect } from 'react';
import { saveUserPreferences, getUserPreferences } from '../lib/user-preferences';

export default function CustomizableLayout({ children }) {
  const [layout, setLayout] = useState([]);

  useEffect(() => {
    const preferences = getUserPreferences();
    setLayout(preferences.layout || []);
  }, []);

  const updateLayout = (newLayout) => {
    setLayout(newLayout);
    saveUserPreferences({ layout: newLayout });
  };

  return (
    <div className="customizable-layout">
      {/* 實現可拖拽的佈局功能 */}
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 實現用戶偏好設置**

```javascript
// src/lib/user-preferences.js
const PREFERENCES_KEY = 'stock-analysis-preferences';

export function saveUserPreferences(preferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

export function getUserPreferences() {
  const preferences = localStorage.getItem(PREFERENCES_KEY);
  return preferences ? JSON.parse(preferences) : {};
}
```

- [ ] **Step 5: 實現測試**

```javascript
// tests/ui/customization.test.js
import { saveUserPreferences, getUserPreferences } from '../../src/lib/user-preferences';

describe('User Preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should save and retrieve user preferences', () => {
    const preferences = { layout: ['chart1', 'chart2'] };
    saveUserPreferences(preferences);
    const retrieved = getUserPreferences();
    expect(retrieved).toEqual(preferences);
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add src/styles src/components src/lib/user-preferences tests/ui/customization.test.js
git commit -m "feat: 實現用戶界面優化和自定義功能"
```

### Task 13: 完整系統測試和部署配置

**Files:**
- Create: `tests/e2e/stock-analysis.test.js`
- Create: `docker-compose.prod.yml`
- Create: `DEPLOYMENT.md`
- Test: 完整系統測試

**Interfaces:**
- Consumes: 完整應用
- Produces: 可部署的生產環境配置

- [ ] **Step 1: 實現端到端測試**

```javascript
// tests/e2e/stock-analysis.test.js
describe('End-to-End Stock Analysis', () => {
  test('should perform full analysis and generate report', async () => {
    // 啟動應用
    // 訪問主頁
    // 搜索股票
    // 查看分析結果
    // 生成報告
    // 驗證報告內容
  });
});
```

- [ ] **Step 2: 創建生產環境Docker配置**

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
```

- [ ] **Step 3: 編寫部署文檔**

```markdown
# 部署指南

## 要求
- Docker
- Docker Compose

## 部署步驟
1. 構建鏡像
2. 啟動服務
3. 訪問應用

## 配置選項
- 數據存儲路徑
- 端口映射
```

- [ ] **Step 4: 執行完整系統測試**

運行所有測試套件確保應用正常工作

- [ ] **Step 5: Commit**

```bash
git add tests/e2e docker-compose.prod.yml DEPLOYMENT.md
git commit -m "feat: 完整系統測試和部署配置"
```