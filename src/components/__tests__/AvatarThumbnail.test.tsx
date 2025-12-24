/**
 * AvatarThumbnail component tests
 */
import React from 'react'
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AvatarThumbnail } from '../AvatarThumbnail'

describe('AvatarThumbnail', () => {
  describe('without image source', () => {
    test('renders initial from name', () => {
      render(<AvatarThumbnail name="John Doe" />)
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    test('renders uppercase initial', () => {
      render(<AvatarThumbnail name="mary jane" />)
      expect(screen.getByText('M')).toBeInTheDocument()
    })

    test('renders I for null name', () => {
      render(<AvatarThumbnail name={null} />)
      expect(screen.getByText('I')).toBeInTheDocument()
    })

    test('renders I for undefined name', () => {
      render(<AvatarThumbnail name={undefined} />)
      expect(screen.getByText('I')).toBeInTheDocument()
    })

    test('renders I for empty string name', () => {
      render(<AvatarThumbnail name="" />)
      expect(screen.getByText('I')).toBeInTheDocument()
    })

    test('renders I for whitespace-only name', () => {
      render(<AvatarThumbnail name="   " />)
      expect(screen.getByText('I')).toBeInTheDocument()
    })

    test('trims name before getting initial', () => {
      render(<AvatarThumbnail name="  Alice  " />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })
  })

  describe('with image source', () => {
    test('renders image when src is provided', () => {
      render(<AvatarThumbnail name="John Doe" src="https://example.com/avatar.jpg" />)
      const img = screen.getByRole('img', { name: /john doe/i })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    })

    test('uses normalized name as alt text', () => {
      render(<AvatarThumbnail name="Jane Smith" src="https://example.com/avatar.jpg" />)
      const img = screen.getByRole('img', { name: /jane smith/i })
      expect(img).toHaveAttribute('alt', 'Jane Smith')
    })

    test('uses Instructor as alt text for null name', () => {
      render(<AvatarThumbnail name={null} src="https://example.com/avatar.jpg" />)
      const img = screen.getByRole('img', { name: /instructor/i })
      expect(img).toBeInTheDocument()
    })

    test('has lazy loading attribute', () => {
      render(<AvatarThumbnail name="John" src="https://example.com/avatar.jpg" />)
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })

  describe('sizes', () => {
    test('applies sm size class', () => {
      const { container } = render(<AvatarThumbnail name="John" size="sm" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('h-8')
      expect(avatar.className).toContain('w-8')
    })

    test('applies md size class (default)', () => {
      const { container } = render(<AvatarThumbnail name="John" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('h-10')
      expect(avatar.className).toContain('w-10')
    })

    test('applies lg size class', () => {
      const { container } = render(<AvatarThumbnail name="John" size="lg" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('h-12')
      expect(avatar.className).toContain('w-12')
    })
  })

  describe('custom className', () => {
    test('applies custom className to initial avatar', () => {
      const { container } = render(<AvatarThumbnail name="John" className="custom-class" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('custom-class')
    })

    test('applies custom className to image avatar', () => {
      render(<AvatarThumbnail name="John" src="https://example.com/avatar.jpg" className="custom-class" />)
      const img = screen.getByRole('img')
      expect(img.className).toContain('custom-class')
    })
  })

  describe('accessibility', () => {
    test('initial avatar has aria-hidden', () => {
      const { container } = render(<AvatarThumbnail name="John" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar).toHaveAttribute('aria-hidden', 'true')
    })

    test('image avatar has accessible alt text', () => {
      render(<AvatarThumbnail name="John Doe" src="https://example.com/avatar.jpg" />)
      expect(screen.getByRole('img', { name: /john doe/i })).toBeInTheDocument()
    })
  })
})
