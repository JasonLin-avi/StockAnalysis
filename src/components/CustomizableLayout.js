'use client';

import React, { useState, useEffect } from 'react';
import { saveUserPreferences, getUserPreferences }  from '../lib/user-preferences';

export default function CustomizableLayout({ children, defaultWidgets = ['technical', 'fundamental', 'news'] }) {
  const [visibleWidgets, setVisibleWidgets] = useState(defaultWidgets);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const prefs = getUserPreferences();
    if (prefs && Array.isArray(prefs.visibleWidgets)) {
      setVisibleWidgets(prefs.visibleWidgets);
    }
    setIsLoaded(true);
  }, []);

  const toggleWidget = (widgetName) => {
    let updated;
    if (visibleWidgets.includes(widgetName)) {
      updated = visibleWidgets.filter(w => w !== widgetName);
    } else {
      updated = [...visibleWidgets, widgetName];
    }
    setVisibleWidgets(updated);
    saveUserPreferences({ visibleWidgets: updated });
  };

  const widgetsDef = [
    { id: 'technical', label: '📈 技術趨勢分析' },
    { id: 'fundamental', label: '🕸️ 基本面雷達圖' },
    { id: 'news', label: '💬 輿情情緒指標' }
  ];

  return (
    <div className="w-full">
      {/* Control Panel */}
      <div className="border border-slate-900 bg-slate-900/30 rounded-2xl p-5 mb-8 backdrop-blur-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          ⚙️ 儀表板自定義配置
        </h4>
        <div className="flex flex-wrap gap-3">
          {widgetsDef.map((widget) => {
            const isVisible = visibleWidgets.includes(widget.id);
            return (
              <button
                key={widget.id}
                type="button"
                onClick={() => toggleWidget(widget.id)}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold border transition-all ${
                  isVisible
                    ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400'
                    : 'bg-slate-900/20 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                }`}
              >
                {widget.label} {isVisible ? '• 顯示中' : '• 已隱藏'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render children dynamically based on visibleWidgets */}
      {isLoaded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {React.Children.map(children, (child) => {
            if (!child) return null;
            const widgetId = child.props.widgetId;
            if (widgetId && !visibleWidgets.includes(widgetId)) {
              return null;
            }
            const isWide = widgetId === 'news' || widgetId === 'backtest';
            return (
              <div className={isWide ? 'lg:col-span-2' : ''}>
                {child}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
