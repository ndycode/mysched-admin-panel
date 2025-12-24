import { describe, it, expect } from 'vitest'
import {
  spring,
  devSpring,
  motionConfig,
  safeLayout,
  fadeIn,
  slideUp,
  hoverScale,
} from '../motion'

describe('motion', () => {
  describe('spring', () => {
    it('has spring type', () => {
      expect(spring.type).toBe('spring')
    })

    it('has stiffness and damping', () => {
      expect(spring.stiffness).toBe(300)
      expect(spring.damping).toBe(25)
    })
  })

  describe('devSpring', () => {
    it('has spring type', () => {
      expect(devSpring.type).toBe('spring')
    })

    it('has higher damping than standard spring', () => {
      expect(devSpring.damping).toBeGreaterThan(spring.damping as number)
    })
  })

  describe('motionConfig', () => {
    it('has layout property', () => {
      expect('layout' in motionConfig).toBe(true)
    })

    it('has transition property', () => {
      expect(motionConfig.transition).toBeDefined()
    })
  })

  describe('safeLayout', () => {
    it('is either undefined or true based on environment', () => {
      expect([undefined, true]).toContain(safeLayout)
    })
  })

  describe('fadeIn', () => {
    it('has initial, animate, and exit states', () => {
      expect(fadeIn.initial).toEqual({ opacity: 0 })
      expect(fadeIn.animate).toEqual({ opacity: 1 })
      expect(fadeIn.exit).toEqual({ opacity: 0 })
    })
  })

  describe('slideUp', () => {
    it('has initial state with y offset', () => {
      expect(slideUp.initial).toEqual({ opacity: 0, y: 10 })
    })

    it('has animate state at y=0', () => {
      expect(slideUp.animate).toEqual({ opacity: 1, y: 0 })
    })

    it('has exit state with y offset', () => {
      expect(slideUp.exit).toEqual({ opacity: 0, y: 10 })
    })
  })

  describe('hoverScale', () => {
    it('has scale property', () => {
      expect(hoverScale.scale).toBe(1.02)
    })

    it('has transition property', () => {
      expect(hoverScale.transition).toBeDefined()
    })
  })
})
