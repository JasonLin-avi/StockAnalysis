/** @jest-environment jsdom */
/**
 * @fileoverview Unit tests for interactive backtest sandbox components (ControlPanel, ResultCards).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ControlPanel from '../../src/components/backtest/ControlPanel';
import ResultCards from '../../src/components/backtest/ResultCards';

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
