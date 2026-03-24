import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Use unique keys per test to avoid cross-contamination
  })

  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`
    const config = { limit: 3, windowMs: 60000 }

    const r1 = checkRateLimit(key, config)
    const r2 = checkRateLimit(key, config)
    const r3 = checkRateLimit(key, config)

    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests over the limit', () => {
    const key = `test-block-${Date.now()}`
    const config = { limit: 2, windowMs: 60000 }

    checkRateLimit(key, config)
    checkRateLimit(key, config)
    const r3 = checkRateLimit(key, config)

    expect(r3.success).toBe(false)
    expect(r3.remaining).toBe(0)
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('returns fallback when no forwarded header', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('127.0.0.1')
  })
})
