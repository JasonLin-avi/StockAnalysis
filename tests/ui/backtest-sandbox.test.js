/** @jest-environment jsdom */
/**
 * @fileoverview Unit tests for interactive backtest sandbox components and page.
 *
 * Verifies rendering of ControlPanel, ResultCards, and BacktestPage, ensuring proper state management
 * and event handling without runtime errors.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ControlPanel from '../../src/components/backtest/ControlPanel';
import ResultCards from '../../src/components/backtest/ResultCards';
import BacktestPage from '../../src/app/backtest/page';

// Mock global fetch to simulate API responses for presets, predict, and evaluate.
global.fetch = jest.fn((url) => {
  if (url === '/api/backtest/presets') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          presets: [
            { id: 'preset-1', symbol: '2330.TW', cutoffDate: '2024-03-01', title: '台積電千元前夕' }
          ]
        })
    });
  }
  if (url === '/api/backtest/predict') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          cutoffDate: '2024-03-01',
          symbol: '2330.TW',
          forecast: {
            trend: 'BULLISH',
            confidence: 9,
            targetPriceRange: [900, 950],
            stopLossPrice: 840,
            keySupport: 850,
            keyResistance: 920,
            rationale: '多頭格局強烈，看好持續突破。'
          }
        })
    });
  }
  if (url === '/api/backtest/evaluate') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          evaluation: {
            accuracyScore: 92,
            directionCorrect: true,
            priceRangeHit: true,
            actualReturnPct: 8.5,
            evaluationSummary: '實際漲幅達 8.5%，精準符合多頭看漲預測。'
          }
        })
    });
  }
  return Promise.reject(new Error('Unknown URL'));
});

describe('ControlPanel Component', () => {
  test('renders input fields and handles symbol and date changes', () => {
    const setSymbol = jest.fn();
    const setCutoffDate = jest.fn();
    const onSubmit = jest.fn();

    render(
      <ControlPanel
        symbol="2330.TW"
        setSymbol={setSymbol}
        cutoffDate="2024-03-01"
        setCutoffDate={setCutoffDate}
        presets={[{ id: 'p1', symbol: 'NVDA', cutoffDate: '2023-05-15', title: 'NVIDIA 財報' }]}
        onSelectPreset={jest.fn()}
        onSubmit={onSubmit}
        loading={false}
      />
    );

    expect(screen.getByLabelText(/股票代碼/i)).toHaveValue('2330.TW');
    expect(screen.getByLabelText(/歷史基準日/i)).toHaveValue('2024-03-01');

    fireEvent.change(screen.getByLabelText(/股票代碼/i), { target: { value: '2317.TW' } });
    expect(setSymbol).toHaveBeenCalledWith('2317.TW');

    fireEvent.click(screen.getByText('開始歷史回測分析'));
    expect(onSubmit).toHaveBeenCalled();
  });
});

describe('ResultCards Component', () => {
  test('renders forecast details when forecast prop is provided', () => {
    const forecast = {
      trend: 'BULLISH',
      confidence: 8,
      targetPriceRange: [900, 950],
      stopLossPrice: 840,
      keySupport: 850,
      keyResistance: 920,
      rationale: '多頭強勢突破'
    };

    render(
      <ResultCards forecast={forecast} evaluation={null} onReveal={jest.fn()} evaluating={false} />
    );

    expect(screen.getByText('🟢 多頭看漲')).toBeInTheDocument();
    expect(screen.getByText('$900 - $950')).toBeInTheDocument();
    expect(screen.getByText('多頭強勢突破')).toBeInTheDocument();
    expect(screen.getByText(/🔓 揭曉未來走勢與自動對比評分/i)).toBeInTheDocument();
  });

  test('renders evaluation details when evaluation prop is provided', () => {
    const forecast = {
      trend: 'BULLISH',
      targetPriceRange: [900, 950],
      stopLossPrice: 840,
      rationale: '看漲'
    };

    const evaluation = {
      accuracyScore: 90,
      directionCorrect: true,
      actualReturnPct: 5.2,
      evaluationSummary: '評估符合預期'
    };

    render(
      <ResultCards forecast={forecast} evaluation={evaluation} onReveal={jest.fn()} evaluating={false} />
    );

    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('+5.2%')).toBeInTheDocument();
    expect(screen.getByText('評估符合預期')).toBeInTheDocument();
  });
});

describe('BacktestPage', () => {
  test('renders header and handles full flow from predict to reveal evaluation', async () => {
    render(<BacktestPage />);

    expect(screen.getByText(/K 線 LLM 歷史時點回測與驗證沙盒/i)).toBeInTheDocument();

    // Click submit to run predict
    const submitBtn = screen.getByText('開始歷史回測分析');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('🟢 多頭看漲')).toBeInTheDocument();
    });

    // Click reveal to trigger evaluation
    const revealBtn = screen.getByText(/🔓 揭曉未來走勢與自動對比評分/i);
    fireEvent.click(revealBtn);

    await waitFor(() => {
      expect(screen.getByText('92')).toBeInTheDocument();
      expect(screen.getByText('+8.5%')).toBeInTheDocument();
      expect(screen.getByText('實際漲幅達 8.5%，精準符合多頭看漲預測。')).toBeInTheDocument();
    });
  });
});
