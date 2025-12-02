/**
 * AdminNav component tests
 * - Verifies brand and user info rendering
 */
import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminNav from '../AdminNav';

test('AdminNav renders navigation links', async () => {
  const mockClient = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'test@example.com', user_metadata: { name: 'Test User' } } } })
    }
  };
  render(<AdminNav supabaseClient={mockClient} />);
  // Check for brand and user info
  expect(screen.getByText(/MySched/i)).toBeInTheDocument();
  // Wait for user info to appear
  expect(await screen.findByText(/Test User|test@example.com/i)).toBeInTheDocument();
});
