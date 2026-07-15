# Design Spec: Stock Analysis Chatbot Agent

This specification details the architecture, design, and implementation plan for integrating an autonomous AI investment assistant chatbot into the Stock Analysis Platform.

## 1. Overview & Goals
The objective is to embed a chatbot widget on the stock analysis page to help users interpret complex financial, technical, and news indicators.
The chatbot will connect to a backend agent powered by LangChain's `deepagents` framework, running the Minimax model through NVIDIA's NIM integrate endpoint.

---

## 2. Architecture & Technology Stack

```mermaid
graph TD
    User([User]) -->|Interact| Widget[Chatbot Widget]
    Widget -->|POST /api/chat {messages, ticker}| NextRoute[Next.js API Route]
    NextRoute -->|Invoke Agent| DeepAgent[DeepAgent Framework]
    DeepAgent -->|Model Call| Minimax[Minimax M2.7 Model]
    DeepAgent -->|Call Tool| ToolBox[Agent Tools]
    ToolBox -->|Query Indicators| CoreLogic[Platform Core Logic / DB]
```

### Frontend
- **React.js & Tailwind CSS**: Build the floating action widget and chat dialog.
- **Next.js Router Context**: Dynamically capture the active stock symbol (`ticker`) from the active URL path `/stock/[symbol]`.
- **Global Context Provider**: Maintain conversation history globally so that navigating across stocks preserves the history while letting the agent adapt to the newly-selected stock.

### Backend
- **Node.js (Next.js API Route)**: `/api/chat` handles incoming chat messages.
- **langchain.js & deepagents**: Used as the core orchestrator.
- **NVIDIA NIM API**: Hosts `minimaxai/minimax-m2.7` at `integrate.api.nvidia.com`.

---

## 3. Configuration & Environment Variables

The following configuration must be added to `.env.local` for local execution and injected securely in production (no hardcoded keys in the codebase):

```bash
# NVIDIA NIM integration for Minimax
NV_MINMAX_KEY="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"
NV_API_URL="https://integrate.api.nvidia.com/v1"
NV_MODEL_NAME="minimaxai/minimax-m2.7"
```

---

## 4. Frontend Design

### ChatbotWidget Components
The chatbot is rendered inside the global layout (`src/app/layout.js`) to prevent state loss during navigation.

1. **Collapsed Icon Button**:
   - Fixed position: `bottom-6 right-6`.
   - Renders a floating chat bubble icon with circular gradient styles.
   - Displays a dynamic badge showing the currently active stock symbol (e.g., `AAPL` or `TSLA`), or remains standard if not on a stock page.
   - Interactive `aria-label="開啟 AI 投資助理對話框"` for accessibility.

2. **Expanded Conversation Dialog**:
   - Position: `bottom-24 right-6`, width: `360px`, height: `450px`, styled with glassmorphism and Tailwind's dark-mode color scheme.
   - **Header**:
     - Displays the title "💬 AI 投資助理" and the active stock symbol badge.
     - **Minimize button (➖)**: Collapses the dialog back to the floating icon while preserving chat messages. `aria-label="最小化對話框"`.
     - **Clear button (❌)**: Clears the message history and collapses the dialog. `aria-label="清除並關閉對話"` (prompts for confirmation).
   - **Body**:
     - Scrollable message container.
     - Automatically scrolls to the bottom on new message chunk arrival.
     - Custom visual status indicator (e.g., "🔄 正在取得技術分析數據...") when the agent invokes tools.
   - **Input Box**:
     - Styled input field with clear placeholders.
     - Keyboard listener for `Escape` to minimize the widget.

---

## 5. Backend Agent Design (`src/lib/chatbot/deep-agent.js`)

We will initialize the agent using `defineDeepAgent` from the `managed-deepagents` package:

### 1. Model Configuration
The model is instantiated using `ChatOpenAI` pointing to the NVIDIA endpoint:
```javascript
const minimaxModel = new ChatOpenAI({
  apiKey: process.env.NV_MINMAX_KEY,
  configuration: {
    baseURL: process.env.NV_API_URL,
  },
  modelName: process.env.NV_MODEL_NAME,
  temperature: 0.2
});
```

### 2. Custom Tools (LangChain Tools)
The agent will be equipped with 4 tools that wrap our core calculations:
1. `get_technical_indicators(symbol: string)`:
   - Fetches SMA, RSI, and MACD states.
   - Source: wraps functions from `src/lib/technical-analysis.js`.
2. `get_fundamental_metrics(symbol: string)`:
   - Fetches balance sheet metrics, growth metrics, and valuation.
   - Source: wraps calculations from `src/lib/fundamental-analysis.js`.
3. `get_news_sentiment(symbol: string)`:
   - Fetches recent headlines and sentiment scores.
   - Source: wraps `src/lib/news-analysis/`.
4. `get_investment_advice(symbol: string)`:
   - Fetches final rating, score breakdown, and allocation recommendation.
   - Source: wraps `src/lib/investment-advisor/`.

### 3. Prompt Template
```
System Prompt:
你是一位資深的 AI 投資顧問助理。當前用戶正在觀看股票：{currentTicker}。
你的職責是利用工具庫中的工具，去查詢這檔股票的各項財務、技術指標或新聞輿情，並為用戶提供深入的 Insight 拆解與解釋。
請優先使用工具查詢數據，切勿編造不存在的數值。
請用繁體中文回答。
```

---

## 6. Accessibility & Quality Standards

- **Interactive Elements**: Every button, input, and interactive option will include explicit `aria-label` tags.
- **Keyboard Access**: The dialog must support keyboard focus management and the `Escape` key close shortcut.
- **Graceful Failures**: If the API key is invalid or external server fails, the backend will return a user-friendly message (`"抱歉，我目前無法連線到 AI 服務。請稍後再試。"`) instead of crashing the Next.js runtime.

---

## 7. Testing Strategy

1. **Unit Tests (Jest)**:
   - Validate the custom tools wrap the underlying analytical modules correctly.
   - Test that `getWatchlist` or other tools gracefully handle invalid ticker inputs.
   - Test API route `/api/chat` responses by mocking the `ChatOpenAI` client.
2. **UI Tests**:
   - Mock navigation changes and verify the active stock badge in the widget updates correctly.
   - Verify keyboard listeners (Esc) correctly trigger minimization.
