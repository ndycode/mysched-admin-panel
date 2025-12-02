/**
 * Sidebar component tests
 * - Verifies sidebar content rendering
 */
import React from 'react';
import { beforeAll, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../Sidebar';

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
});

test('Sidebar renders sidebar content', () => {
  render(<Sidebar mobileOpen={false} onMobileOpenChange={() => {}} />);
  // Check for sidebar elements
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
