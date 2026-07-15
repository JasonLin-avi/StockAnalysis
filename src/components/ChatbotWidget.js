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
