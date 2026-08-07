# K-Line LLM Historical Backtest & Validation Design Specification

## 1. Executive Summary

This feature provides an interactive historical backtesting sandbox. It allows users to set a past "Cutoff Date" for any stock, causing the system to strict-cut the historical K-line data at that point. 
An AI Agent (**Predictor LLM**) acts as a trader standing at that exact historical moment, analyzing past data (OHLCV & technical indicators) without future data leakage to generate trend forecasts. 
After viewing the AI forecast, the user can "Reveal the Future", which fetches the real subsequent market data and invokes a second AI Agent (**Evaluator LLM**) to compare the forecast against real outcomes and score the AI's technical analysis accuracy.

---

## 2. Architecture & Data Flow

### 2.1 System Diagram

```
[User UI] 
  │ 1. Select Symbol & Cutoff Date
  ▼
[Backend Router] 
  │ 2. Fetch Full Historical Data
  ▼
[Lookahead Protection Data Splitter]
  ├── (A) Past Data (Cutoff - 90d to Cutoff) ────► [Predictor LLM] ──► Forecast Result (JSON)
  └── (B) Future Data (Cutoff to Cutoff + N d) ──┐
                                                 ▼
[User Clicks "Reveal Future"] ───────────────► [Evaluator LLM] ──► Score & Review Report (JSON)
```

### 2.2 Dual-LLM Engine Responsibilities

1. **Role 1: Predictor LLM**
   - **Input**: Strictly historical OHLCV data (up to 90 days before `cutoffDate`), calculated technical indicators (MA5/20/60, RSI, MACD, Bollinger Bands).
   - **Constraint**: Strict system prompt enforcing "No knowledge of the future after `cutoffDate`".
   - **Output Structure**:
     ```json
     {
       "trend": "BULLISH" | "BEARISH" | "NEUTRAL",
       "confidence": 8,
       "targetPriceRange": [900, 950],
       "stopLossPrice": 840,
       "keySupport": 850,
       "keyResistance": 920,
       "rationale": "Trend analysis, indicator signals, and support/resistance breakdown..."
     }
     ```

2. **Role 2: Evaluator LLM**
   - **Input**: `predictionResult` from Predictor LLM + `futureOHLCV` (actual market movements over N days after `cutoffDate`).
   - **Output Structure**:
     ```json
     {
       "accuracyScore": 85,
       "directionCorrect": true,
       "priceRangeHit": true,
       "actualReturnPct": 5.4,
       "evaluationSummary": "The LLM accurately predicted the bullish breakout above MA20..."
     }
     ```

---

## 3. UI/UX Component & State Design

### 3.1 Components

- **Control Panel**: Symbol search, Cutoff Date selector, Prediction Horizon slider (5 / 10 / 20 days), Preset selector (Optional historical showcase cases).
- **Interactive K-Line Chart**:
  - Solid K-line bars for historical data.
  - Vertical dashed indicator for `Cutoff Date`.
  - Masked / Blurred / Hidden section for future data until revealed.
- **Dual-Card Results Section**:
  - **Left Card (LLM Forecast)**: Displays directional badge, target price ranges, key support/resistance, and full rationale.
  - **Right Card (Outcome & Evaluation)**: Shows "Reveal Future" trigger button initially, then displays score badge (0-100), actual price trajectory stats, and evaluator review.

### 3.2 State Machine Transitions

`IDLE` ──(User Submits)──► `PREDICTING` ──(Returns Forecast)──► `PREDICTED`
                                                                   │
                                                          (User Clicks Reveal)
                                                                   ▼
`COMPLETED` ◄──(Returns Score)── `EVALUATING`

---

## 4. API Endpoints

### 4.1 `GET /api/backtest/presets`
- **Response**: List of predefined historical backtest showcase cases (e.g. TSMC 2024 breakout).

### 4.2 `POST /api/backtest/predict`
- **Request Body**: `{ symbol: string, cutoffDate: string, lookbackDays?: number }`
- **Response**: `{ pastKlines: Array, forecast: PredictorOutput }`

### 4.3 `POST /api/backtest/evaluate`
- **Request Body**: `{ symbol: string, cutoffDate: string, predictionDays: number, predictionResult: PredictorOutput }`
- **Response**: `{ futureKlines: Array, evaluation: EvaluatorOutput }`

---

## 5. Security & Data Leakage Protection

1. **Backend Partitioning**: The API endpoint physically slices the array of stock data at `cutoffDate`. `futureKlines` are never passed to the Predictor LLM.
2. **Prompt Isolation**: System instructions strictly constrain temporal context.
3. **Caching**: SQLite caching for identical `(symbol, cutoffDate)` queries to optimize LLM API costs.
