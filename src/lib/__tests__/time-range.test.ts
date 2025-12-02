import { describe, expect, it } from 'vitest'

import { parseTimeRange, resolveTimeRange } from '../time-range'

describe('parseTimeRange', () => {
  it('parses 24-hour ranges', () => {
    expect(parseTimeRange('09:00-10:30')).toEqual({ start: '09:00', end: '10:30' })
  })

  it('supports en dash separators and spaces', () => {
    expect(parseTimeRange('8:00 – 9:30')).toEqual({ start: '08:00', end: '09:30' })
  })

  it('handles 12-hour times with trailing meridiem', () => {
    expect(parseTimeRange('1:00-2:30 PM')).toEqual({ start: '13:00', end: '14:30' })
  })

  it('infers missing meridiem from end time', () => {
    expect(parseTimeRange('8:15-9:45 am')).toEqual({ start: '08:15', end: '09:45' })
    expect(parseTimeRange('1:00-4:00 PM')).toEqual({ start: '13:00', end: '16:00' })
  })

  it('keeps midnight boundaries accurate', () => {
    expect(parseTimeRange('12:00 am-1:30 am')).toEqual({ start: '00:00', end: '01:30' })
    expect(parseTimeRange('12:00 pm-1:30 pm')).toEqual({ start: '12:00', end: '13:30' })
  })

  it('supports compact numeric times', () => {
    expect(parseTimeRange('730-915')).toEqual({ start: '07:30', end: '09:15' })
    expect(parseTimeRange('1300-1500')).toEqual({ start: '13:00', end: '15:00' })
  })

  it('returns null for invalid inputs', () => {
    expect(parseTimeRange('')).toBeNull()
    expect(parseTimeRange('9:00')).toBeNull()
    expect(parseTimeRange('bad range')).toBeNull()
    expect(parseTimeRange('11:00-1:00')).toBeNull()
  })
})

describe('resolveTimeRange', () => {
  it('prefers explicit start/end values', () => {
    expect(
      resolveTimeRange({ start: '7:30 AM', end: '9:00 AM', range: 'ignored' }),
    ).toEqual({ start: '07:30', end: '09:00' })
  })

  it('falls back to range string when needed', () => {
    expect(resolveTimeRange({ range: '9-11 AM' })).toEqual({ start: '09:00', end: '11:00' })
  })

  it('returns null when insufficient data', () => {
    expect(resolveTimeRange({})).toBeNull()
    expect(resolveTimeRange({ start: '8:00' })).toBeNull()
    expect(resolveTimeRange({ start: '8:00', end: '7:00' })).toBeNull()
  })
})
