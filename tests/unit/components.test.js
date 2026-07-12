/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
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
  });
});
