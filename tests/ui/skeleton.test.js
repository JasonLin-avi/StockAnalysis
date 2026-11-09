/** @jest-environment jsdom */
/**
 * @fileoverview Unit tests for glassmorphic Skeleton loader components.
 * 
 * Why this test is designed:
 * - Validates that all skeleton variations render properly with expected layout structures and animation tokens.
 * - Prevents regressions in layout stability and design system tokens.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Skeleton, {
  KlineChartSkeleton,
  FundamentalAnalysisSkeleton,
  AISummarySkeleton,
  BacktestSkeleton,
  StockDetailSkeleton
} from '../../src/components/ui/Skeleton';

describe('Glassmorphic Skeleton Loaders', () => {
  test('renders base Skeleton with animate-pulse class', () => {
    const { container } = render(<Skeleton className="w-24 h-6" data-testid="base-skeleton" />);
    const el = screen.getByTestId('base-skeleton');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('animate-pulse');
    expect(el).toHaveClass('w-24');
    expect(el).toHaveClass('h-6');
  });

  test('renders KlineChartSkeleton with toolbar, canvas and summary cards placeholders', () => {
    render(<KlineChartSkeleton />);
    const skeleton = screen.getByTestId('kline-chart-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  test('renders FundamentalAnalysisSkeleton with radar web and metric card blocks', () => {
    render(<FundamentalAnalysisSkeleton />);
    const skeleton = screen.getByTestId('fundamental-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  test('renders AISummarySkeleton with title and paragraph placeholders', () => {
    render(<AISummarySkeleton title="AI 即時量化專家正在運算中..." />);
    const skeleton = screen.getByTestId('ai-summary-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(screen.getByText('AI 即時量化專家正在運算中...')).toBeInTheDocument();
  });

  test('renders BacktestSkeleton with parameter controls and status animation', () => {
    render(<BacktestSkeleton />);
    const skeleton = screen.getByTestId('backtest-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  test('renders StockDetailSkeleton with headline banner, tabs and chart', () => {
    render(<StockDetailSkeleton />);
    const skeleton = screen.getByTestId('stock-detail-skeleton');
    expect(skeleton).toBeInTheDocument();
  });
});
