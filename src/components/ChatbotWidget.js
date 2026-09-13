'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Why: Define custom component renderers for ReactMarkdown within the chatbot UI.
// Preserves compact sizing, handles dark-theme contrast, and provides responsive horizontal scrolling for tables and code blocks.
const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h1 className="text-base font-bold text-slate-100 my-2 pb-1 border-b border-slate-700">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-slate-100 my-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-semibold text-cyan-400 my-1.5">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-cyan-200">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
  pre: ({ children }) => (
    <div className="my-2 rounded bg-slate-950 p-2 border border-slate-700/80 overflow-x-auto text-xs font-mono text-cyan-300 [&>code]:bg-transparent [&>code]:p-0 [&>code]:border-0">
      <pre>{children}</pre>
    </div>
  ),
  code: ({ children, ...props }) => (
    <code className="bg-slate-900 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-700/60" {...props}>
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-cyan-500 pl-2.5 my-2 text-slate-300 italic text-xs">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded border border-slate-700">
      <table className="min-w-full text-xs border-collapse divide-y divide-slate-700">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-900 text-slate-200 font-semibold">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-700/50 bg-slate-800/50">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-slate-700/30">{children}</tr>,
  th: ({ children }) => <th className="px-2 py-1 text-left font-medium border-b border-slate-700">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 border-b border-slate-700/50">{children}</td>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-2 border-slate-700" />,
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticker, setTicker] = useState('Stock');
  const pathname = usePathname();
  const messageEndRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);

  // Why: Extract stock ticker automatically from routing pathname, fallback to 'Stock' if not on a stock page.
  // Normalize numeric Taiwan stocks (e.g., 2330) by appending .TW to ensure downstream API and LLM consistency.
  useEffect(() => {
    const match = pathname.match(/\/stock\/([A-Za-z0-9.]+)/);
    if (match && match[1]) {
      let extracted = match[1].toUpperCase();
      if (/^\d{4,6}$/.test(extracted)) {
        extracted = `${extracted}.TW`;
      }
      setTicker(extracted);
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

  // Why: Manage keyboard focus transitions between the toggle button and input field to ensure full accessibility (a11y).
  useEffect(() => {
    if (isOpen) {
      // Why: Focus the input field immediately when the chatbot opens so screen reader and keyboard users can type right away.
      inputRef.current?.focus();
    } else {
      // Why: Return focus to the trigger button when the chatbot is closed to maintain logical tab sequence.
      buttonRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    // Why: Prevent form submission if input is empty, loading is in progress, or we are not on a stock page (ticker is 'Stock').
    if (!input.trim() || isLoading || ticker === 'Stock') return;

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
        const errorText = await response.text();
        console.error('Chat API Failed:', response.status, errorText);
        throw new Error(`對話連線失敗，請稍後再試 (Status: ${response.status})`);
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
          ref={buttonRef}
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200 text-white text-2xl relative"
          aria-label="開啟 AI 投資助理對話框"
        >
          💬
          {ticker !== 'Stock' && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-900">
              {ticker}
            </span>
          )}
        </button>
      ) : (
        <div className="w-96 h-[480px] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
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
                  className={`max-w-[85%] rounded-lg px-3 py-2 leading-relaxed break-words ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none whitespace-pre-wrap'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                  }`}
                >
                  {/* Why: Assistant messages often contain rich markdown (headers, bullets, tables, bold text) produced by LLMs, while user messages are plain text */}
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="text-slate-100 text-sm leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {msg.content || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start" role="status" aria-live="polite">
                <div className="bg-slate-800 border border-slate-700 text-slate-400 rounded-lg rounded-bl-none px-3 py-2 flex items-center gap-2">
                  <span className="animate-spin" aria-hidden="true">🔄</span>
                  <span>AI 正在呼叫工具 analysis 中...</span>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ticker !== 'Stock' ? `問問關於 ${ticker} 的指標...` : "請選擇個股以開始對話"}
              disabled={isLoading || ticker === 'Stock'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 text-slate-100 placeholder-slate-500"
              aria-label="訊息輸入欄位"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || ticker === 'Stock'}
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
