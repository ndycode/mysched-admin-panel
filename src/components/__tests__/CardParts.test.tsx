/**
 * CardHeader and CardBody component tests
 * - Verifies children rendering for both parts
 */
import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardHeader, CardBody } from '../ui/Card';

test('CardHeader renders children', () => {
  render(<CardHeader>Header</CardHeader>);
  expect(screen.getByText('Header')).toBeInTheDocument();
});

test('CardBody renders children', () => {
  render(<CardBody>Body</CardBody>);
  expect(screen.getByText('Body')).toBeInTheDocument();
});
