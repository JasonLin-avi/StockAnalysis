/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChartContainer from '../../src/components/ChartContainer';
import TechnicalIndicatorsChart from '../../src/components/TechnicalIndicatorsChart';
import FundamentalAnalysisChart from '../../src/components/FundamentalAnalysisChart';
import NewsSentimentChart from '../../src/components/NewsSentimentChart';
import InvestmentAdvicePanel from '../../src/components/InvestmentAdvicePanel';

// Mock Recharts ResponsiveContainer to prevent width/height 0 rendering bugs in JSDOM.
jest.mock('recharts', () => {
  const OriginalRecharts = jest.requireActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }) => (
      <div className="mock-responsive-container" style={{ width: 800, height: 600 }}>
        {children}
      </div>
    )
  };
});

describe('React Visual Components', () => {

  // ---------------------------------------------------------------------------
  // ChartContainer Component Tests
  // ---------------------------------------------------------------------------
  describe('ChartContainer', () => {
    test('renders title, subtitle and children content', () => {
      render(
        <ChartContainer title="Test Title" subtitle="Test Subtitle">
          <div data-testid="child-element">Chart Body</div>
        </ChartContainer>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
      expect(screen.getByTestId('child-element')).toHaveTextContent('Chart Body');
    });
  });

  // ---------------------------------------------------------------------------
  // TechnicalIndicatorsChart Component Tests
  // ---------------------------------------------------------------------------
  describe('TechnicalIndicatorsChart', () => {
    const mockHistorical = [
      { date: '2026-07-10', close: 150 },
      { date: '2026-07-11', close: 155 }
    ];
    const mockMa = [148, 149];

    test('renders with stock symbol and pricing trend descriptions', () => {
      render(
        <TechnicalIndicatorsChart 
          historicalData={mockHistorical} 
          maData={mockMa} 
          symbol="TSLA" 
        />
      );
      expect(screen.getByText(/TSLA 技術趨勢/)).toBeInTheDocument();
    });

    test('renders empty state message when no data is provided', () => {
      render(<TechnicalIndicatorsChart historicalData={[]} maData={[]} symbol="XYZ" />);
      expect(screen.getByText('XYZ 技術指標')).toBeInTheDocument();
      expect(screen.getByText('未提供充足數據進行技術指標渲染')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // FundamentalAnalysisChart Component Tests
  // ---------------------------------------------------------------------------
  describe('FundamentalAnalysisChart', () => {
    const mockFundamental = {
      pe: { value: 18.5, status: 'Fair' },
      eps: { value: 4.2, trend: 'Growing', status: 'Strong' },
      debtRatio: { value: 0.45, status: 'Healthy' },
      revenueGrowth: { value: 0.12, status: 'High Growth' },
      cashFlow: { status: 'Strong' }
    };

    test('renders spider chart panel along with detailed financial cards', () => {
      render(<FundamentalAnalysisChart fundamentalData={mockFundamental} symbol="AAPL" />);
      
      expect(screen.getByText('AAPL 財務健康雷達圖')).toBeInTheDocument();
      expect(screen.getByText('市盈率 P/E')).toBeInTheDocument();
      expect(screen.getByText('18.5x')).toBeInTheDocument();
      expect(screen.getAllByText('Fair')[0]).toBeInTheDocument();
      
      expect(screen.getByText('每股收益 EPS')).toBeInTheDocument();
      expect(screen.getByText('4.2')).toBeInTheDocument();
      
      expect(screen.getByText('負債比率 Debt')).toBeInTheDocument();
      expect(screen.getByText('45.00%')).toBeInTheDocument();
    });

    test('renders empty state when fundamental data is missing', () => {
      render(<FundamentalAnalysisChart fundamentalData={{}} symbol="MSFT" />);
      expect(screen.getByText('MSFT 基本面評分')).toBeInTheDocument();
      expect(screen.getByText('未提供充足數據進行基本面分析')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // NewsSentimentChart Component Tests
  // ---------------------------------------------------------------------------
  describe('NewsSentimentChart', () => {
    const mockNews = {
      financialNews: { score: 0.4, sentiment: 'Positive' },
      socialSentiment: { score: 0.2, sentiment: 'Positive' },
      majorEvents: {
        events: [
          { title: 'Robotaxi Launch', date: '2026-08-08', impact: 'High Positive', description: 'Game changer' }
        ],
        hasHighImpactEvent: true
      }
    };

    test('renders sentiment graphs alongside catalyst event lists', () => {
      render(<NewsSentimentChart newsData={mockNews} symbol="TSLA" />);
      
      expect(screen.getByText('TSLA 輿情情緒指標')).toBeInTheDocument();
      expect(screen.getByText('重大事件與催化劑 (Events)')).toBeInTheDocument();
      expect(screen.getByText('Robotaxi Launch')).toBeInTheDocument();
      expect(screen.getByText('High Positive')).toBeInTheDocument();
      expect(screen.getByText('Game changer')).toBeInTheDocument();
    });

    test('renders empty state when news data is missing', () => {
      render(<NewsSentimentChart newsData={{}} symbol="MSFT" />);
      expect(screen.getByText('MSFT 情緒分析')).toBeInTheDocument();
      expect(screen.getByText('未提供充足數據進行輿情與事件評估')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // InvestmentAdvicePanel Component Tests
  // ---------------------------------------------------------------------------
  describe('InvestmentAdvicePanel', () => {
    const mockAdvice = {
      portfolio: { targetWeight: 0.12, allocationClass: 'Overweight', rationale: 'Strong balance sheet' },
      buySell: { action: 'Buy', confidenceScore: 0.85, summary: 'Highly recommended' },
      risk: { riskLevel: 'Low', riskFactors: ['Minor competition'], riskMitigation: 'Set 10% stop loss' }
    };

    test('renders rating badges, weights, and defensive risk strategy instructions', () => {
      render(<InvestmentAdvicePanel advice={mockAdvice} />);
      
      expect(screen.getByText('AI 智能投資決策報告')).toBeInTheDocument();
      expect(screen.getByText('LOW RISK')).toBeInTheDocument();
      expect(screen.getByText('Buy')).toBeInTheDocument();
      expect(screen.getByText('12%')).toBeInTheDocument();
      expect(screen.getByText('Strong balance sheet')).toBeInTheDocument();
      expect(screen.getByText('Minor competition')).toBeInTheDocument();
      expect(screen.getByText('Set 10% stop loss')).toBeInTheDocument();
    });

    test('renders fallback message when no advice payload exists', () => {
      render(<InvestmentAdvicePanel advice={{}} />);
      expect(screen.getByText('暫無投資建議報告數據。')).toBeInTheDocument();
    });

    test('renders modals and handles Escape key closure', () => {
      const mockAdvice = {
        portfolio: { targetWeight: 0.12, allocationClass: 'Overweight', rationale: 'Strong balance sheet' },
        buySell: { action: 'Buy', confidenceScore: 0.85, summary: 'Highly recommended' },
        risk: { riskLevel: 'Low', riskFactors: ['Minor competition'], riskMitigation: 'Set 10% stop loss' }
      };

      const { rerender } = render(<InvestmentAdvicePanel advice={mockAdvice} />);
      
      // Initially, no modal should be visible and body style overflow should be clean
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');

      // Find the rating trigger button using its descriptive aria-label and trigger click
      const ratingBtn = screen.getByLabelText('查看評級策略公式與說明');

      // Why we test three separate dismissal triggers (Escape, Close Button, and Backdrop Click):
      // - Complete user flow coverage: To ensure different user groups (keyboard-only, screen reader, mouse/pointer users) can reliably close the modal using their preferred and standard interface actions.
      // - Prevent modal locking: To verify that scroll-locking side effects ('hidden' body overflow) are consistently cleared regardless of how the modal is closed, avoiding rendering bugs on the host page.
      
      // 1. Verify closure via Escape key
      fireEvent.click(ratingBtn);
      
      // Verify that the rating explanation modal is rendered and background body scroll lock is applied
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('評級策略 (Rating) 指標說明')).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');

      // Simulate Escape keydown on window to trigger modal dismissal
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // Verify modal is closed and body scroll is restored to original state
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');

      // 2. Verify closure via Close button click
      fireEvent.click(ratingBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');

      const closeBtn = screen.getByLabelText('關閉說明彈窗');
      fireEvent.click(closeBtn);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');

      // 3. Verify closure via Backdrop click
      fireEvent.click(ratingBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');

      // 模擬帶有 breakdown 數據的 advice 物件
      const mockAdviceWithBreakdown = {
        portfolio: { 
          targetWeight: 0.12, 
          allocationClass: 'Overweight', 
          rationale: 'Excellent health',
          healthScore: 8,
          sentimentScore: 0.6,
          breakdown: {
            debtRatio: { status: 'Healthy', score: 2 },
            eps: { status: 'Strong', score: 2 },
            revenueGrowth: { status: 'High Growth', score: 2 },
            cashFlow: { status: 'Strong', score: 2 },
            pe: { status: 'Fair', score: 0 }
          }
        },
        buySell: { 
          action: 'Buy', 
          confidenceScore: 0.81, 
          summary: 'Highly recommended',
          totalScore: 83,
          breakdown: {
            technical: {
              score: 23,
              rsi: { value: 28.4, status: 'Oversold', score: 10 },
              ma: { value: 155.2, ma: 150.0, status: 'Bullish', score: 10 },
              macd: { value: -0.05, status: 'Bearish', score: 3 }
            },
            fundamental: {
              score: 47,
              pe: { value: 18.5, status: 'Fair', score: 7 },
              eps: { value: 4.2, status: 'Strong', score: 10 },
              debtRatio: { value: 0.45, status: 'Healthy', score: 10 },
              revenueGrowth: { value: 0.12, status: 'High Growth', score: 10 },
              cashFlow: { value: 1200000000, status: 'Strong', score: 10 }
            },
            sentiment: {
              score: 13,
              news: { value: 0.4, score: 7 },
              social: { value: 0.2, score: 6 }
            }
          }
        },
        risk: { riskLevel: 'Low', riskFactors: [], riskMitigation: '' }
      };
      
      rerender(<InvestmentAdvicePanel advice={mockAdviceWithBreakdown} />);
      // 點擊問號並斷言對話框渲染了 RSI 與 P/E 原始值表格行
      const ratingBtnWithBreakdown = screen.getByLabelText('查看評級策略公式與說明');
      fireEvent.click(ratingBtnWithBreakdown);
      
      expect(screen.getByText('28.4')).toBeInTheDocument();
      expect(screen.getByText('Oversold (超賣)')).toBeInTheDocument();
      expect(screen.getByText('83 / 100')).toBeInTheDocument();
    });
  });
});
