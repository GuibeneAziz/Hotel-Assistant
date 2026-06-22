/**
 * Redis client with graceful degradation.
 *
 * When the Redis instance is unreachable (e.g. Upstash free-tier paused,
 * no local Redis running) the client logs ONE warning and then silently
 * treats every cache operation as a miss / no-op.  The app continues
 * to function correctly — just without the caching layer.
 */

import Redis from 'ioredis'

let redis: Redis | null = null
let redisAvailable = true
let errorLogged = false          // only log the first failure

function buildClient(): Redis {
  const url = process.env.REDIS_URL

  const useTls = url?.startsWith('rediss://')

  const client = url
    ? new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
        retryStrategy: (times) => {
          if (times >= 2) {
            redisAvailable = false
            return null  // stop reconnecting
          }
          return Math.min(times * 200, 1000)
        },
      })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times >= 2) {
            redisAvailable = false
            return null
          }
          return Math.min(times * 200, 1000)
        },
      })

  // Log connection issues exactly once, then stay quiet
  client.on('error', (err: Error) => {
    if (!errorLogged) {
      console.warn(`⚠️  Redis unavailable (${err.message.split('\n')[0]}) — caching disabled`)
      errorLogged = true
      redisAvailable = false
    }
  })

  client.on('connect', () => {
    redisAvailable = true
    errorLogged = false
    console.log('✅ Redis connected')
  })

  return client
}

export function getRedisClient(): Redis {
  if (!redis) redis = buildClient()
  return redis
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

export async function getCached<T>(key: string): Promise<T | null> {
  if (!redisAvailable) return null
  try {
    const raw = await getRedisClient().get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    redisAvailable = false
    return null
  }
}

export async function setCache(key: string, value: any, expirationSeconds = 3600): Promise<void> {
  if (!redisAvailable) return
  try {
    await getRedisClient().setex(key, expirationSeconds, JSON.stringify(value))
  } catch {
    redisAvailable = false
  }
}

export async function deleteCache(key: string): Promise<void> {
  if (!redisAvailable) return
  try {
    await getRedisClient().del(key)
  } catch {
    redisAvailable = false
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redisAvailable) return
  try {
    const keys = await getRedisClient().keys(pattern)
    if (keys.length > 0) await getRedisClient().del(...keys)
  } catch {
    redisAvailable = false
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await getRedisClient().ping()
    return result === 'PONG'
  } catch {
    return false
  }
}
