/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatbotWidget from '../../src/components/ChatbotWidget';

// Mock react-markdown because it uses ESM format which breaks in Jest
jest.mock('react-markdown', () => {
  const MockMarkdown = ({ children }) => <span>{children}</span>;
  MockMarkdown.displayName = 'MockMarkdown';
  return MockMarkdown;
});

// Mock remark-gfm because it uses ESM format which breaks in Jest
jest.mock('remark-gfm', () => ({}));

// Mock next/navigation params
let mockPathname = '/stock/AAPL';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname
}));

describe('ChatbotWidget Component', () => {
  beforeEach(() => {
    mockPathname = '/stock/AAPL';
  });

  test('renders floating bubble icon initially with stock badge', () => {
    render(<ChatbotWidget />);
    const bubble = screen.getByRole('button', { name: /開啟 AI 投資助理對話框/i });
    expect(bubble).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  test('opens chatbot dialog on click, and minimizes on click minimize button', () => {
    render(<ChatbotWidget />);
    const bubble = screen.getByRole('button', { name: /開啟 AI 投資助理對話框/i });
    fireEvent.click(bubble);

    expect(screen.getByText('AI 投資助理')).toBeInTheDocument();
    
    const minimizeBtn = screen.getByRole('button', { name: /最小化對話框/i });
    fireEvent.click(minimizeBtn);
    
    expect(screen.queryByText('AI 投資助理')).not.toBeInTheDocument();
  });

  test('clears conversation on click clear button', () => {
    // Mock window.confirm to return true
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<ChatbotWidget />);
    const bubble = screen.getByRole('button', { name: /開啟 AI 投資助理對話框/i });
    fireEvent.click(bubble);

    const clearBtn = screen.getByRole('button', { name: /清除並關閉對話/i });
    fireEvent.click(clearBtn);

    expect(confirmSpy).toHaveBeenCalledWith('確定要清除對話歷史紀錄嗎？');
    expect(screen.queryByText('AI 投資助理')).not.toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  test('has correct aria-label attributes for accessibility', () => {
    render(<ChatbotWidget />);
    const openBtn = screen.getByRole('button', { name: '開啟 AI 投資助理對話框' });
    expect(openBtn).toBeInTheDocument();

    fireEvent.click(openBtn);

    const minimizeBtn = screen.getByRole('button', { name: '最小化對話框' });
    const clearBtn = screen.getByRole('button', { name: '清除並關閉對話' });
    const inputField = screen.getByRole('textbox', { name: '訊息輸入欄位' });
    const submitBtn = screen.getByRole('button', { name: '送出訊息' });

    expect(minimizeBtn).toBeInTheDocument();
    expect(clearBtn).toBeInTheDocument();
    expect(inputField).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();
  });

  test('disables input and send button, and displays specific placeholder when not on a stock page', () => {
    mockPathname = '/'; // Why: Simulate home page where ticker will fall back to 'Stock'
    render(<ChatbotWidget />);
    const bubble = screen.getByRole('button', { name: /開啟 AI 投資助理對話框/i });
    fireEvent.click(bubble);

    const inputField = screen.getByRole('textbox', { name: '訊息輸入欄位' });
    const submitBtn = screen.getByRole('button', { name: '送出訊息' });

    expect(inputField).toBeDisabled();
    expect(submitBtn).toBeDisabled();
    expect(inputField.placeholder).toBe('請選擇個股以開始對話');
  });

  test('manages focus correctly when opening and closing the widget', () => {
    render(<ChatbotWidget />);
    const bubble = screen.getByRole('button', { name: /開啟 AI 投資助理對話框/i });
    
    // Why: Ensure the bubble has focus before click so we can return it later.
    bubble.focus();
    expect(document.activeElement).toBe(bubble);

    // Why: Open the widget and expect focus to jump to the input text box.
    fireEvent.click(bubble);
    const inputField = screen.getByRole('textbox', { name: '訊息輸入欄位' });
    expect(document.activeElement).toBe(inputField);

    // Why: Minimize the widget and expect focus to return to the newly mounted bubble trigger button.
    const minimizeBtn = screen.getByRole('button', { name: /最小化對話框/i });
    fireEvent.click(minimizeBtn);
    
    const closedBubble = screen.getByRole('button', { name: /開啟 AI 投資助理對話框/i });
    expect(document.activeElement).toBe(closedBubble);
  });
});
