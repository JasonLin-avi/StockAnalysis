import React from 'react';

/**
 * Common Card Container for Financial Charts
 * Provides a unified visual structure with modern padding, border radius, and typography.
 * 
 * Why this container is isolated:
 * - Consistency: Standardizes the card theme (shadows, background, margins) across all charts.
 *   Ensures that switching CSS frameworks or design systems only requires editing this single file.
 * - Semantic layout: Separates title headers from actual visualization canvas, ensuring 
 *   proper accessibility tree mapping.
 */
export default function ChartContainer({ children, title, subtitle }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 mb-6">
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
