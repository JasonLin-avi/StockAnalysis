/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Header from '../../src/components/Header';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/funds-flow'
}));

global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        twii: { displayPrice: '23,450.80', displayChange: '▲ +0.85%', color: 'text-emerald-400' },
        gspc: { displayPrice: '5,632.10', displayChange: '▼ -0.21%', color: 'text-rose-400' },
        fearGreed: { score: 74, text: '極度貪婪' }
      })
  })
);

describe('Header Navigation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all key navigation links including funds-flow', async () => {
    await act(async () => {
      render(<Header />);
    });

    // Check main branding
    expect(screen.getByText('Antigravity')).toBeInTheDocument();
    expect(screen.getByText('Quant')).toBeInTheDocument();

    // Check desktop navigation items
    expect(screen.getByRole('link', { name: '市場看板' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '資金流向' })).toHaveAttribute('href', '/funds-flow');
    expect(screen.getByRole('link', { name: '量化戰情室' })).toHaveAttribute('href', '/hub');
    expect(screen.getByRole('link', { name: '歷史報告' })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: /我的關注|關注清單/ })).toHaveAttribute('href', '/watchlist');
  });

  it('applies active styling to the currently matched route', async () => {
    await act(async () => {
      render(<Header />);
    });
    const fundsFlowLink = screen.getByRole('link', { name: '資金流向' });
    expect(fundsFlowLink.className).toContain('text-cyan-300');
  });

  it('toggles mobile menu when clicking hamburger button', async () => {
    await act(async () => {
      render(<Header />);
    });
    const toggleBtn = screen.getByRole('button', { name: '開啟選單' });
    expect(toggleBtn).toBeInTheDocument();

    // Click to open mobile drawer
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    // Now links should appear inside the mobile drawer as well
    const allFundsFlowLinks = screen.getAllByRole('link', { name: '資金流向' });
    expect(allFundsFlowLinks.length).toBeGreaterThanOrEqual(2);
  });
});
