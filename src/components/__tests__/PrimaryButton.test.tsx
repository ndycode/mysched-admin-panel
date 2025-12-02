/**
 * PrimaryButton component tests
 * - Verifies label rendering
 */

import { test, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PrimaryButton } from '../../components/ui/Button';

test('PrimaryButton renders with label', () => {
  render(<PrimaryButton>Click me</PrimaryButton>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
