/**
 * Card component tests
 * - Verifies children rendering
 * - Verifies custom className application
 */
import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../ui/Card';

test('Card renders children', () => {
  render(<Card><div>Card Content</div></Card>);
  expect(screen.getByText('Card Content')).toBeInTheDocument();
});

test('Card applies custom className', () => {
  render(<Card className="test-class">Hello</Card>);
  // Card is a div, so getByText('Hello') is the child, Card is the parent div
  const card = screen.getByText('Hello').closest('div');
  expect(card).toHaveClass('test-class');
});
