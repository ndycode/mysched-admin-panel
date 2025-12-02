/**
 * StatusBar component tests
 * - Verifies status text rendering
 */
import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBar from '../StatusBar';

test('StatusBar renders status text', () => {
  render(<StatusBar />);
  // Should show CONNECTING... initially
  expect(screen.getByText(/CONNECTING/i)).toBeInTheDocument();
});
