/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoricalBacktestPanel from '../../src/components/HistoricalBacktestPanel';

const mockBacktestData = {
  winRate5d: 0.65,
  winRate10d: 0.70,
  winRate20d: 0.58,
  avgReturn5d: 1.24,
  avgReturn10d: 2.50,
  avgReturn20d: 3.10,
  currentPattern: { rsi: 32.5, ma20Bias: -2.3, macdRatio: 0.012 },
  similarDays: [
    { date: '2024-05-12', similarity: 98.2, return5d: 2.3, return10d: 4.1, return20d: 5.2 }
  ]
};

describe('HistoricalBacktestPanel Component', () => {
  test('renders backtest statistics and table correctly', () => {
    render(<HistoricalBacktestPanel backtest={mockBacktestData} />);
    expect(screen.getByText('歷史相似環境回測')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('2024-05-12')).toBeInTheDocument();
  });

  test('renders friendly message and does not crash when given fallback backtest data', () => {
    // Why: Insufficient historical data will result in missing currentPattern and empty similarDays.
    const fallbackData = {
      winRate5d: 0,
      winRate10d: 0,
      winRate20d: 0,
      avgReturn5d: 0,
      avgReturn10d: 0,
      avgReturn20d: 0,
      similarDays: []
    };
    render(<HistoricalBacktestPanel backtest={fallbackData} />);
    expect(screen.getByText('歷史相似環境回測')).toBeInTheDocument();
    expect(screen.getByText('歷史數據不足，無法進行相似度回測')).toBeInTheDocument();
  });
});
