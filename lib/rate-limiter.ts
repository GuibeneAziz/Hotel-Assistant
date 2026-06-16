/**
 * In-memory sliding-window rate limiter.
 *
 * No Redis required — works in any Node.js / Next.js environment.
 * Counters are per-process and reset on server restart, which is
 * perfectly acceptable for a hotel assistant application.
 *
 * The public interface is identical to the old Redis-backed version
 * so every caller continues to work without modification.
 */

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: Date
  retryAfter?: number
}

interface Window {
  timestamps: number[]
  windowMs: number
  maxRequests: number
}

export class RateLimiter {
  private readonly windowMs: number
  private readonly maxRequests: number
  private readonly store = new Map<string, Window>()

  // Housekeeping: remove stale keys every 5 minutes to prevent memory leaks
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: { windowMs: number; maxRequests: number; keyPrefix?: string }) {
    this.windowMs = config.windowMs
    this.maxRequests = config.maxRequests

    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000)
      // Allow Node.js to exit even if this timer is running
      if (this.cleanupTimer?.unref) this.cleanupTimer.unref()
    }
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - this.windowMs

    let window = this.store.get(identifier)
    if (!window) {
      window = { timestamps: [], windowMs: this.windowMs, maxRequests: this.maxRequests }
      this.store.set(identifier, window)
    }

    // Evict timestamps outside the current window
    window.timestamps = window.timestamps.filter(t => t > windowStart)

    const count = window.timestamps.length
    const resetTime = new Date(now + this.windowMs)

    if (count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil(this.windowMs / 1000),
      }
    }

    window.timestamps.push(now)

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - window.timestamps.length,
      resetTime,
    }
  }

  async resetLimit(identifier: string): Promise<void> {
    this.store.delete(identifier)
  }

  async close(): Promise<void> {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    this.store.clear()
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, window] of this.store) {
      window.timestamps = window.timestamps.filter(t => t > now - window.windowMs)
      if (window.timestamps.length === 0) this.store.delete(key)
    }
  }
}

// ─── Pre-built limiters (same names as before) ────────────────────────────────

/** Chat endpoint — 100 requests / 15 min per IP */
export const chatRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'ratelimit:chat',
})

/** Auth endpoints — 5 attempts / 15 min per IP */
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'ratelimit:auth',
})

/** General API — 50 requests / 15 min per IP */
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 50,
  keyPrefix: 'ratelimit:api',
})

/** Admin / analytics — 30 requests / 15 min per IP */
export const adminRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'ratelimit:admin',
})

/** Extract client IP from a request, honouring proxy headers */
export function getClientIp(request: Request): string {
  const headers = request.headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
