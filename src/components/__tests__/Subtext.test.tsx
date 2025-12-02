/**
 * Subtext component tests
 * - Verifies Subtext rendering
 */
import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Subtext } from '../ui/Metric';

test('Subtext renders text', () => {
  render(<Subtext>Some subtext</Subtext>);
  expect(screen.getByText('Some subtext')).toBeInTheDocument();
});
