# Chatbot Agent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed a floating AI investment assistant chatbot that can explain stock indicators and insights by connecting to a LangChain deepagent in the backend.

**Architecture:** Use the `deepagents` package in a Next.js API route `/api/chat`. The agent runs the Minimax model using ChatOpenAI pointing to the NVIDIA NIM integration endpoint, with access to 4 custom tool functions querying stock indicators. The frontend widget stays mounted globally to preserve chat state and automatically tracks the URL path to infer the current stock symbol.

**Tech Stack:** Next.js, React, Tailwind CSS, langchain.js, managed-deepagents, @langchain/openai, Jest

## Global Constraints
- Data Storage: Chat messages are managed in memory (React state) and sent to the API.
- Accessibility: All interactive elements (buttons, inputs) must include explicit `aria-label` tags. The SVG icons must include `aria-hidden="true"`.
- Styling: Styling must adhere to Tailwind CSS standards.
- Coding Style: Code comments must explain "Why" and not "What".

---

### Task 1: Tools and Agent Configuration

**Files:**
- Create: `src/lib/chatbot/tools.js`
- Create: `src/lib/chatbot/deep-agent.js`
- Test: `tests/unit/chatbot-agent.test.js`

**Interfaces:**
- Consumes: `src/lib/integration.js::performFullAnalysis`
- Produces: `financialAdvisorAgent` (LangGraph Runnable object)

- [ ] **Step 1: Write the failing test**
  Create `tests/unit/chatbot-agent.test.js` with tests verifying that the custom tools invoke `performFullAnalysis` and return structured outputs, and that the agent compiled successfully.

  ```javascript
  // tests/unit/chatbot-agent.test.js
  const { getTechnicalIndicatorsTool, getFundamentalMetricsTool } = require('../../src/lib/chatbot/tools');
  const { financialAdvisorAgent } = require('../../src/lib/chatbot/deep-agent');
  const integration = require('../../src/lib/integration');

  jest.mock('../../src/lib/integration', () => ({
    performFullAnalysis: jest.fn()
  }));

  describe('Chatbot Agent & Tools', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('get_technical_indicators tool calls performFullAnalysis and returns JSON data', async () => {
      integration.performFullAnalysis.mockResolvedValue({
        symbol: 'AAPL',
        price: 150.0,
        technical: { rsi: 65.4, macd: { histogram: [0.1] }, ma: [148.0] }
      });

      const toolInput = { symbol: 'AAPL' };
      // Invoke the tool directly using the schema-compliant parameter
      const resultStr = await getTechnicalIndicatorsTool.invoke(toolInput);
      const result = JSON.parse(resultStr);

      expect(integration.performFullAnalysis).toHaveBeenCalledWith('AAPL');
      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBe(150.0);
      expect(result.technical.rsi).toBe(65.4);
    });

    test('financialAdvisorAgent compiles successfully and has invoke method', () => {
      expect(financialAdvisorAgent).toBeDefined();
      expect(typeof financialAdvisorAgent.invoke).toBe('function');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/unit/chatbot-agent.test.js`
  Expected: FAIL (modules not found or imports fail)

- [ ] **Step 3: Write minimal implementation**
  Create `src/lib/chatbot/tools.js` to define the 4 tools. Use a simple caching strategy to avoid redundant API calls to `performFullAnalysis`.

  ```javascript
  // src/lib/chatbot/tools.js
  const { DynamicStructuredTool } = require('@langchain/core/tools');
  const { z } = require('zod');
  const { performFullAnalysis } = require('../integration');

  let analysisCache = {};
  let cacheTimestamp = {};

  // Why: Cache analysis results for 10 seconds to avoid redundant API fetches when the agent calls multiple tools in a single turn.
  async function getCachedAnalysis(symbol) {
    const ticker = symbol.toUpperCase();
    const now = Date.now();
    if (analysisCache[ticker] && (now - cacheTimestamp[ticker] < 10000)) {
      return analysisCache[ticker];
    }
    const result = await performFullAnalysis(ticker);
    analysisCache[ticker] = result;
    cacheTimestamp[ticker] = now;
    return result;
  }

  const getTechnicalIndicatorsTool = new DynamicStructuredTool({
    name: 'get_technical_indicators',
    description: 'Get technical analysis indicators (RSI, MACD, MA) and closing prices for a given stock symbol.',
    schema: z.object({
      symbol: z.string().describe('The stock symbol, e.g., AAPL'),
    }),
    func: async ({ symbol }) => {
      try {
        const data = await getCachedAnalysis(symbol);
        return JSON.stringify({
          symbol: data.symbol,
          price: data.price,
          technical: data.technical,
        });
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
  });

  const getFundamentalMetricsTool = new DynamicStructuredTool({
    name: 'get_fundamental_metrics',
    description: 'Get fundamental analysis metrics (valuation, growth, PE ratio) for a given stock symbol.',
    schema: z.object({
      symbol: z.string().describe('The stock symbol, e.g., AAPL'),
    }),
    func: async ({ symbol }) => {
      try {
        const data = await getCachedAnalysis(symbol);
        return JSON.stringify({
          symbol: data.symbol,
          price: data.price,
          fundamental: data.fundamental,
        });
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
  });

  const getNewsSentimentTool = new DynamicStructuredTool({
    name: 'get_news_sentiment',
    description: 'Get recent news headlines and sentiment scores for a given stock symbol.',
    schema: z.object({
      symbol: z.string().describe('The stock symbol, e.g., AAPL'),
    }),
    func: async ({ symbol }) => {
      try {
        const data = await getCachedAnalysis(symbol);
        return JSON.stringify({
          symbol: data.symbol,
          news: data.news,
        });
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
  });

  const getInvestmentAdviceTool = new DynamicStructuredTool({
    name: 'get_investment_advice',
    description: 'Get compiled investment rating (Buy/Sell/Hold) and score breakdowns for a given stock symbol.',
    schema: z.object({
      symbol: z.string().describe('The stock symbol, e.g., AAPL'),
    }),
    func: async ({ symbol }) => {
      try {
        const data = await getCachedAnalysis(symbol);
        return JSON.stringify({
          symbol: data.symbol,
          advice: data.advice,
        });
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
  });

  module.exports = {
    getTechnicalIndicatorsTool,
    getFundamentalMetricsTool,
    getNewsSentimentTool,
    getInvestmentAdviceTool,
  };
  ```

  Create `src/lib/chatbot/deep-agent.js` using `createDeepAgent` from `deepagents`.
  ```javascript
  // src/lib/chatbot/deep-agent.js
  const { createDeepAgent } = require('deepagents');
  const { ChatOpenAI } = require('@langchain/openai');
  const {
    getTechnicalIndicatorsTool,
    getFundamentalMetricsTool,
    getNewsSentimentTool,
    getInvestmentAdviceTool,
  } = require('./tools');

  // Why: Initialize NVIDIA NIM compatible OpenAI wrapper using configuration from environment variables.
  const minimaxModel = new ChatOpenAI({
    apiKey: process.env.NV_MINMAX_KEY || 'dummy_key',
    configuration: {
      baseURL: process.env.NV_API_URL || 'https://integrate.api.nvidia.com/v1',
    },
    modelName: process.env.NV_MODEL_NAME || 'minimaxai/minimax-m2.7',
    temperature: 0.2,
  });

  // Why: Compile the agent using deepagents runner with full accessibility tools bound for stock analysis lookups.
  const financialAdvisorAgent = createDeepAgent({
    model: minimaxModel,
    tools: [
      getTechnicalIndicatorsTool,
      getFundamentalMetricsTool,
      getNewsSentimentTool,
      getInvestmentAdviceTool,
    ],
    systemPrompt: `你是一位專業的 AI 投資顧問助理。當前用戶正在觀看股票：{currentTicker}。
你的任務是利用工具庫中的工具，查詢該股票的技術指標、財報指標、新聞輿情與投資評級，為用戶解答疑問並提供精闢的解釋。
請優先使用工具查詢數據，切勿憑空捏造不存在的股票數值或建議。請以繁體中文回答。`,
  });

  module.exports = { financialAdvisorAgent };
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/unit/chatbot-agent.test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/chatbot/tools.js src/lib/chatbot/deep-agent.js tests/unit/chatbot-agent.test.js
  git commit -m "feat: implement tools and compile deep-agent for chatbot"
  ```

---

### Task 2: API Route Handler

**Files:**
- Create: `src/app/api/chat/route.js`
- Test: `tests/unit/chatbot-api.test.js`

**Interfaces:**
- Consumes: `src/lib/chatbot/deep-agent.js::financialAdvisorAgent`
- Produces: HTTP POST `/api/chat`

- [ ] **Step 1: Write the failing test**
  Create `tests/unit/chatbot-api.test.js` verifying that the API endpoint returns 400 when body parameters are missing, and returns the compiled message history on success.

  ```javascript
  // tests/unit/chatbot-api.test.js
  const { GET, POST } = require('../../src/app/api/chat/route');
  const { financialAdvisorAgent } = require('../../src/lib/chatbot/deep-agent');
  const { NextResponse } = require('next/server');

  jest.mock('../../src/lib/chatbot/deep-agent', () => ({
    financialAdvisorAgent: {
      invoke: jest.fn()
    }
  }));

  describe('Chatbot API Route', () => {
    test('POST returns 400 when messages or ticker is missing', async () => {
      const mockReq = {
        json: async () => ({})
      };
      const res = await POST(mockReq);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Messages and ticker are required');
    });

    test('POST returns updated messages on successful agent invocation', async () => {
      financialAdvisorAgent.invoke.mockResolvedValue({
        messages: [
          { role: 'user', content: 'hello' },
          { role: 'assistant', content: 'hello user' }
        ]
      });

      const mockReq = {
        json: async () => ({
          messages: [{ role: 'user', content: 'hello' }],
          ticker: 'AAPL'
        })
      };

      const res = await POST(mockReq);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.messages).toHaveLength(2);
      expect(data.messages[1].content).toBe('hello user');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/unit/chatbot-api.test.js`
  Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
  Create `src/app/api/chat/route.js`. Since API routes in App Router use ESM:
  ```javascript
  // src/app/api/chat/route.js
  import { NextResponse } from 'next/server';
  import { financialAdvisorAgent } from '../../../lib/chatbot/deep-agent';
  import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

  export const dynamic = 'force-dynamic';

  // Why: Next.js API handler must parse messages to LangChain Message objects before passing to deepagents graph runner.
  export async function POST(request) {
    try {
      const { messages, ticker } = await request.json();
      if (!messages || !ticker) {
        return NextResponse.json({ error: 'Messages and ticker are required' }, { status: 400 });
      }

      // Format messages into LangChain message classes
      const formattedMessages = messages.map(msg => {
        if (msg.role === 'user') return new HumanMessage(msg.content);
        if (msg.role === 'system') return new SystemMessage(msg.content);
        return new AIMessage(msg.content);
      });

      // Invoke the state graph with system prompt context parameters
      const response = await financialAdvisorAgent.invoke(
        { messages: formattedMessages },
        { configurable: { currentTicker: ticker } }
      );

      // Serialize result back to standard JSON payload
      const serializableMessages = response.messages.map(msg => {
        let role = 'assistant';
        if (msg instanceof HumanMessage) role = 'user';
        if (msg instanceof SystemMessage) role = 'system';
        return {
          role,
          content: msg.content
        };
      });

      return NextResponse.json({ messages: serializableMessages });
    } catch (err) {
      console.error('Chatbot API Route Error:', err);
      return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/unit/chatbot-api.test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/api/chat/route.js tests/unit/chatbot-api.test.js
  git commit -m "feat: implement API route handler for chatbot agent"
  ```

---

### Task 3: UI Widget Integration

**Files:**
- Create: `src/components/ChatbotWidget.js`
- Test: `tests/unit/chatbot-widget.test.js`
- Modify: `src/app/layout.js` (Integrate the widget)

**Interfaces:**
- Consumes: HTTP POST `/api/chat`
- Produces: Collapsible, badged, accessible floating chatbot widget.

- [ ] **Step 1: Write the failing test**
  Create `tests/unit/chatbot-widget.test.js` to assert the widget renders correctly, minimizes, clears conversation, and binds correct `aria-label` tags.

  ```javascript
  // tests/unit/chatbot-widget.test.js
  import React from 'react';
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import ChatbotWidget from '../../src/components/ChatbotWidget';

  // Mock next/navigation params
  jest.mock('next/navigation', () => ({
    usePathname: () => '/stock/AAPL'
  }));

  describe('ChatbotWidget Component', () => {
    test('renders floating bubble icon initially with stock badge', () => {
      render(<ChatbotWidget />);
      const bubble = screen.getByRole('button', { name: /開啟 AI 投資助理對話框/i });
      expect(bubble).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    test('opens chatbot dialog on click, and minimizes on click minimize button', () => {
      render(<ChatbotWidget />);
      const bubble = screen.getByRole('button', { name: /開啟 AI 投資助理對話框/i });
      fireEvent.click(bubble);

      expect(screen.getByText('💬 AI 投資助理')).toBeInTheDocument();
      
      const minimizeBtn = screen.getByRole('button', { name: /最小化對話框/i });
      fireEvent.click(minimizeBtn);
      
      expect(screen.queryByText('💬 AI 投資助理')).not.toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/unit/chatbot-widget.test.js`
  Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
  Create `src/components/ChatbotWidget.js` with fully styled floating widget and interactive dialogs.

  ```javascript
  // src/components/ChatbotWidget.js
  'use client';

  import React, { useState, useEffect, useRef } from 'react';
  import { usePathname } from 'next/navigation';

  export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ticker, setTicker] = useState('Stock');
    const pathname = usePathname();
    const messageEndRef = useRef(null);

    // Why: Extract stock ticker automatically from routing pathname, fallback to 'Stock' if not on a stock page.
    useEffect(() => {
      const match = pathname.match(/\/stock\/([A-Za-z0-9]+)/);
      if (match && match[1]) {
        setTicker(match[1].toUpperCase());
      } else {
        setTicker('Stock');
      }
    }, [pathname]);

    // Why: Auto-scroll message container to ensure the latest conversation response is visible to the user.
    useEffect(() => {
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages, isLoading]);

    // Why: Listen for Escape key to close the chat dialog, promoting accessibility and fast keyboard navigation.
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && isOpen) {
          setIsOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSend = async (e) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMsg = { role: 'user', content: input };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages,
            ticker: ticker
          })
        });

        if (!response.ok) {
          throw new Error('對話連線失敗，請稍後再試');
        }

        const data = await response.json();
        setMessages(data.messages || []);
      } catch (err) {
        setMessages([...newMessages, { role: 'assistant', content: `❌ 錯誤: ${err.message}` }]);
      } finally {
        setIsLoading(false);
      }
    };

    const handleClear = () => {
      if (window.confirm('確定要清除對話歷史紀錄嗎？')) {
        setMessages([]);
        setIsOpen(false);
      }
    };

    return (
      <div className="fixed bottom-6 right-6 z-50 font-sans">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200 text-white text-2xl relative"
            aria-label="開啟 AI 投資助理對話框"
          >
            💬
            {ticker !== 'Stock' && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xxs font-bold px-1.5 py-0.5 rounded-full border border-slate-900">
                {ticker}
              </span>
            )}
          </button>
        ) : (
          <div className="w-96 h-[480px] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-direction flex-col overflow-hidden text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <span className="font-semibold text-sm">AI 投資助理</span>
                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded font-mono">
                  {ticker}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-200 text-sm px-1.5 py-0.5 rounded transition-colors"
                  aria-label="最小化對話框"
                  title="最小化"
                >
                  ➖
                </button>
                <button
                  onClick={handleClear}
                  className="text-slate-400 hover:text-rose-400 text-sm px-1.5 py-0.5 rounded transition-colors"
                  aria-label="清除並關閉對話"
                  title="清除紀錄"
                >
                  ❌
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scrollbar-thin">
              {messages.length === 0 && (
                <div className="text-slate-500 text-center mt-12">
                  您好！我是您的 AI 投資助理。我已經隨時準備好解讀 <strong>{ticker}</strong> 的技術與財務指標。請在下方輸入您的問題！
                </div>
              )}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 text-slate-400 rounded-lg rounded-bl-none px-3 py-2 flex items-center gap-2">
                    <span className="animate-spin">🔄</span>
                    <span>AI 正在呼叫工具分析中...</span>
                  </div>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={ticker !== 'Stock' ? `問問關於 ${ticker} 的指標...` : "請選擇個股以開始對話"}
                disabled={isLoading}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 text-slate-100 placeholder-slate-500"
                aria-label="訊息輸入欄位"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded px-4 py-1.5 text-sm font-semibold transition-colors disabled:text-slate-400"
                aria-label="送出訊息"
              >
                傳送
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }
  ```

  Modify `src/app/layout.js`. Inject the `ChatbotWidget` globally.
  Wait, let's view the layout.js file using `view_file` to see where to inject.
  Let's do this mapping in the plan:
  - Import `ChatbotWidget` from `@/components/ChatbotWidget` or `./components/ChatbotWidget` depending on alias configs.
  - Insert `<ChatbotWidget />` inside the body next to Header/Footer.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/unit/chatbot-widget.test.js`
  Expected: PASS

- [ ] **Step 5: Run npm run build to check compilation**
  Run: `npm run build`
  Expected: Success without compilation errors.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/ChatbotWidget.js src/app/layout.js tests/unit/chatbot-widget.test.js
  git commit -m "feat: integrate ChatbotWidget globally and verify build"
  ```
