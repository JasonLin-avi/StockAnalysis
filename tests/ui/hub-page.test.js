/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import HubPage from '../../src/app/hub/page';

describe('Hub Page Layout', () => {
  it('renders the header and layout grid', () => {
    render(<HubPage />);
    expect(screen.getByText('Analytics Hub')).toBeInTheDocument();
  });
});
