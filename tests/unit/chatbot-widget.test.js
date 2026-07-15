/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatbotWidget from '../../src/components/ChatbotWidget';

// Mock next/navigation params
jest.mock('next/navigation', () => ({
  usePathname: () => '/stock/AAPL'
}));

describe('ChatbotWidget Component', () => {
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
});
