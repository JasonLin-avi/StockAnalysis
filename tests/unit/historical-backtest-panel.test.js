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
});
