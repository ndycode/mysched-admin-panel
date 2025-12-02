/**
 * Metric component tests
 * - Verifies MetricTitle and MetricValue rendering
 */
import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricTitle, MetricValue } from '../ui/Metric';

test('MetricTitle renders text', () => {
  render(<MetricTitle>Title</MetricTitle>);
  expect(screen.getByText('Title')).toBeInTheDocument();
});

test('MetricValue renders value', () => {
  render(<MetricValue>42</MetricValue>);
  expect(screen.getByText('42')).toBeInTheDocument();
});
