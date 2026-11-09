/**
 * @jest-environment jsdom
 * @fileoverview UI tests for Reports Page
 * Verifies that ReportsPage fetches data via report.service and renders UI correctly.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ReportsPage from '../../src/app/reports/page';
import { getAllReports } from '../../src/services/report.service';

jest.mock('../../src/services/report.service', () => ({
  getAllReports: jest.fn()
}));

jest.mock('../../src/components/Header', () => {
  return function MockHeader() {
    return <header data-testid="mock-header">Header</header>;
  };
});

describe('ReportsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state when no reports are found', async () => {
    getAllReports.mockResolvedValue([]);

    const Page = await ReportsPage();
    render(Page);

    expect(screen.getByText('歷史分析報告')).toBeInTheDocument();
    expect(screen.getByText('尚未在資料庫中生成任何分析報告')).toBeInTheDocument();
    expect(getAllReports).toHaveBeenCalledTimes(1);
  });

  test('renders report cards when reports exist in database', async () => {
    getAllReports.mockResolvedValue([
      {
        symbol: '2330.TW',
        name: '台積電',
        date: '2026-11-09',
        advice: {
          buySell: {
            action: 'Buy',
            summary: '長期均線多頭排列，建議波段偏多操作。'
          }
        }
      }
    ]);

    const Page = await ReportsPage();
    render(Page);

    expect(screen.getByText('台積電 (2330.TW)')).toBeInTheDocument();
    expect(screen.getByText('Buy')).toBeInTheDocument();
    expect(screen.getByText('長期均線多頭排列，建議波段偏多操作。')).toBeInTheDocument();
  });

  test('renders error alert when getAllReports throws error', async () => {
    getAllReports.mockRejectedValue(new Error('Database connection failed'));

    const Page = await ReportsPage();
    render(Page);

    expect(screen.getByText(/無法讀取資料庫報告：Database connection failed/)).toBeInTheDocument();
  });
});
