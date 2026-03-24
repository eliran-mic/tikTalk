/**
 * Sliding window rate limiter with in-memory store.
 * Keyed by IP address. Resets on server restart.
 */

interface RateLimitEntry {
  timestamps: number[]
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup(windowMs: number) {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
  // Allow Node to exit even if the timer is still running
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  ensureCleanup(config.windowMs)

  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  if (entry.timestamps.length >= config.limit) {
    // Rate limited — find the earliest timestamp in window to determine reset
    const earliest = entry.timestamps[0]
    const resetAt = earliest + config.windowMs

    return {
      success: false,
      remaining: 0,
      resetAt,
    }
  }

  // Allow the request
  entry.timestamps.push(now)

  return {
    success: true,
    remaining: config.limit - entry.timestamps.length,
    resetAt: now + config.windowMs,
  }
}

// Predefined rate limit configs for different route groups
export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },       // 10 req/min
  generate: { limit: 5, windowMs: 60_000 },     // 5 req/min
  general: { limit: 100, windowMs: 60_000 },    // 100 req/min
} as const

/**
 * Extract the client IP from a request.
 * Checks x-forwarded-for first (for reverse proxies), falls back to a default.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  // Fallback — in production behind a load balancer, x-forwarded-for should exist
  return '127.0.0.1'
}

/**
 * Apply rate limiting to a request. Returns a 429 Response if the limit is
 * exceeded, or null if the request is allowed.
 */
export function applyRateLimit(
  request: Request,
  group: keyof typeof RATE_LIMITS
): Response | null {
  const ip = getClientIp(request)
  const config = RATE_LIMITS[group]
  const key = `${group}:${ip}`
  const result = checkRateLimit(key, config)

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      }
    )
  }

  return null
}
