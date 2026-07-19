/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import HubPage from '../../src/app/hub/page';

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve([])
});

describe('Hub Page Layout', () => {
  it('renders the header and layout grid', () => {
    render(<HubPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});


