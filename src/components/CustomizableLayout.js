'use client';

import React, { useState, useEffect } from 'react';
import { saveUserPreferences, getUserPreferences } from '../lib/user-preferences';
import { CogIcon } from './ui/Icons';

export default function CustomizableLayout({ children, defaultWidgets = [] }) {
  const [visibleWidgets, setVisibleWidgets] = useState(defaultWidgets);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const prefs = getUserPreferences();
    if (prefs && prefs.layout && Array.isArray(prefs.layout)) {
      setVisibleWidgets(prefs.layout);
    }
    setIsLoaded(true);
  }, []);

  const toggleWidget = (widgetId) => {
    let updated;
    if (visibleWidgets.includes(widgetId)) {
      updated = visibleWidgets.filter((id) => id !== widgetId);
    } else {
      updated = [...visibleWidgets, widgetId];
    }
    setVisibleWidgets(updated);
    saveUserPreferences({ layout: updated });
  };

  const widgetsDef = [
    { id: 'technical', label: '技術趨勢分析' },
    { id: 'fundamental', label: '基本面雷達圖' },
    { id: 'news', label: '輿情情緒指標' }
  ];

  return (
    <div className="w-full">
      {/* Control Panel */}
      <div className="border border-slate-800/80 bg-[#0B0F19]/60 rounded-2xl p-5 mb-8 backdrop-blur-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <CogIcon className="w-4 h-4 text-cyan-400" />
          <span>儀表板自定義配置</span>
        </h4>
        <div className="flex flex-wrap gap-3">
          {widgetsDef.map((widget) => {
            const isVisible = visibleWidgets.includes(widget.id);
            return (
              <button
                key={widget.id}
                type="button"
                onClick={() => toggleWidget(widget.id)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
                  isVisible
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
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
