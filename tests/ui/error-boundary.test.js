/** @jest-environment jsdom */
/**
 * @fileoverview Unit and UI resilience tests for ErrorBoundary component.
 * 
 * Why this test is designed:
 * - Ensures that errors occurring in any children tree are safely caught without triggering
 *   an unhandled white screen across the application.
 * - Verifies custom fallback UI, default glassmorphic card, and retry (重新載入) functionality.
 * - Confirms resetKeys changes trigger automatic boundary recovery.
 */

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary, { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';

// Helper component that throws on demand
function FaultyComponent({ shouldThrow = false, message = 'Component crashed!' }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="child-content">Normal Operational View</div>;
}

describe('ErrorBoundary UI Resilience Component', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Why: Silence expected React error boundary logs in test output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('renders children correctly when no error occurs', () => {
    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-content')).toHaveTextContent('Normal Operational View');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('catches error, displays default glassmorphic error fallback card and retry button', () => {
    render(
      <ErrorBoundary fallbackTitle="圖表載入失敗">
        <FaultyComponent shouldThrow={true} message="Canvas context lost" />
      </ErrorBoundary>
    );

    const alertCard = screen.getByRole('alert');
    expect(alertCard).toBeInTheDocument();
    expect(screen.getByText('圖表載入失敗')).toBeInTheDocument();
    expect(screen.getByText('Canvas context lost')).toBeInTheDocument();

    const reloadBtn = screen.getByRole('button', { name: /重新載入/i });
    expect(reloadBtn).toBeInTheDocument();
  });

  test('calls onReset and re-renders successfully when user clicks 重新載入 button', () => {
    const onResetMock = jest.fn();

    function TestHost() {
      const [explode, setExplode] = useState(true);
      return (
        <ErrorBoundary
          onReset={() => {
            onResetMock();
            setExplode(false);
          }}
        >
          <FaultyComponent shouldThrow={explode} message="Network fault" />
        </ErrorBoundary>
      );
    }

    render(<TestHost />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network fault')).toBeInTheDocument();

    const reloadBtn = screen.getByRole('button', { name: /重新載入/i });
    fireEvent.click(reloadBtn);

    expect(onResetMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('supports custom fallback render function with error info and reset handler', () => {
    const customFallback = ({ error, resetErrorBoundary }) => (
      <div data-testid="custom-fallback">
        <span>自訂錯誤: {error.message}</span>
        <button onClick={resetErrorBoundary}>點此重試</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <FaultyComponent shouldThrow={true} message="Fatal calculation error" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('自訂錯誤: Fatal calculation error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '點此重試' })).toBeInTheDocument();
  });

  test('automatically resets error boundary when resetKeys change', () => {
    function ResetableHost() {
      const [symbol, setSymbol] = useState('2330.TW');
      return (
        <div>
          <button onClick={() => setSymbol('AAPL')}>Switch Stock</button>
          <ErrorBoundary resetKeys={[symbol]}>
            <FaultyComponent shouldThrow={symbol === '2330.TW'} message="Failed for 2330.TW" />
          </ErrorBoundary>
        </div>
      );
    }

    render(<ResetableHost />);

    // Initial render fails for 2330.TW
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed for 2330.TW')).toBeInTheDocument();

    // Switch symbol triggers resetKeys change and automatically recovers
    fireEvent.click(screen.getByRole('button', { name: 'Switch Stock' }));
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('withErrorBoundary HOC wraps component with ErrorBoundary', () => {
    const SafeFaultyComponent = withErrorBoundary(FaultyComponent, {
      fallbackTitle: 'HOC 保護區塊異常'
    });

    render(<SafeFaultyComponent shouldThrow={true} message="HOC caught exception" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('HOC 保護區塊異常')).toBeInTheDocument();
    expect(screen.getByText('HOC caught exception')).toBeInTheDocument();
  });
});
