/**
 * Single source of truth for PostgreSQL connection settings.
 *
 * Reads .env files in the same order as Next.js (.env.local wins) so scripts and
 * the app always target the same database.
 *
 * Windows note: Docker Postgres is mapped to port 5433 by default to avoid
 * conflicting with a local PostgreSQL service on 5432.
 */

import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { parse as parseDotenv } from 'dotenv'

const DEFAULT_DOCKER_PORT = '5433'

let mergedEnvCache: Record<string, string> | null = null

function normalizeEnvValue(value?: string): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/** Merge .env* files the same way Next.js does for local development. */
function getMergedEnvFiles(): Record<string, string> {
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd && mergedEnvCache) return mergedEnvCache

  const merged: Record<string, string> = {}
  const root = process.cwd()
  const files = ['.env', '.env.local', '.env.development', '.env.development.local']

  for (const fileName of files) {
    const filePath = path.join(root, fileName)
    if (!existsSync(filePath)) continue
    Object.assign(merged, parseDotenv(readFileSync(filePath)))
  }

  if (isProd) mergedEnvCache = merged
  return merged
}

function envValue(key: string): string | undefined {
  const fromFiles = normalizeEnvValue(getMergedEnvFiles()[key])
  const fromProcess = normalizeEnvValue(process.env[key])
  // Next.js can keep a stale process.env.DATABASE_URL on Windows after .env.local changes.
  if (key === 'DATABASE_URL' || key.startsWith('POSTGRES_') || key === 'DATABASE_SSL') {
    return fromFiles || fromProcess
  }
  return fromProcess || fromFiles
}

function runningInsideDocker(): boolean {
  return (
    process.env.DOCKER === 'true' ||
    process.env.RUNNING_IN_DOCKER === 'true' ||
    normalizeEnvValue(process.env.HOSTNAME)?.includes('hotel-assistant')
  )
}

function buildUrlFromParts(): string | null {
  const user = envValue('POSTGRES_USER')
  const password = envValue('POSTGRES_PASSWORD')
  const db = envValue('POSTGRES_DB')
  if (!user || !password || !db) return null

  const host = runningInsideDocker()
    ? envValue('POSTGRES_HOST') || 'postgres'
    : envValue('POSTGRES_HOST') || 'localhost'
  const port =
    envValue('POSTGRES_PORT') || (host === 'postgres' ? '5432' : DEFAULT_DOCKER_PORT)

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`
}

/** Resolve the connection string used by the app and scripts. */
export function resolveDatabaseUrl(): string {
  let url = envValue('DATABASE_URL') || buildUrlFromParts() || ''

  if (!url) {
    throw new Error(
      'DATABASE_URL is missing. Set it in .env (Neon) or run `npm run db:use-docker` for local Docker Postgres.'
    )
  }

  if (!runningInsideDocker() && url.includes('@postgres:')) {
    const port = envValue('POSTGRES_PORT') || DEFAULT_DOCKER_PORT
    url = url.replace('@postgres:', `@localhost:${port === '5432' ? DEFAULT_DOCKER_PORT : port}:`)
  }

  return url
}

export function shouldUseDatabaseSsl(url: string = resolveDatabaseUrl()): boolean {
  if (envValue('DATABASE_SSL') === 'true') return true
  if (envValue('DATABASE_SSL') === 'false') return false
  return /neon\.tech|sslmode=require|sslmode=verify/i.test(url)
}

export interface DatabaseHealth {
  ok: boolean
  host: string
  database: string
  user: string
  hotels: number
  attractions: number
  error?: string
  hint?: string
}

export function describeDatabaseTarget(url: string = resolveDatabaseUrl()): {
  host: string
  database: string
  user: string
  port: string
  provider: 'neon' | 'docker-local' | 'other'
} {
  const parsed = new URL(url.replace(/^postgresql:/, 'http:'))
  const host = parsed.hostname
  const provider =
    /neon\.tech/i.test(host) ? 'neon' :
    host === 'localhost' || host === '127.0.0.1' ? 'docker-local' :
    'other'

  return {
    host,
    database: parsed.pathname.replace(/^\//, '').split('?')[0],
    user: parsed.username,
    port: parsed.port || '5432',
    provider,
  }
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const url = resolveDatabaseUrl()
  const target = describeDatabaseTarget(url)

  try {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({
      connectionString: url,
      ...(shouldUseDatabaseSsl(url) ? { ssl: { rejectUnauthorized: false } } : {}),
      connectionTimeoutMillis: 8000,
      max: 1,
    })

    try {
      const hotels = await pool.query('SELECT COUNT(*)::int AS n FROM hotels')
      const attractions = await pool.query('SELECT COUNT(*)::int AS n FROM nearby_attractions')

      return {
        ok: true,
        host: target.host,
        database: target.database,
        user: target.user,
        hotels: hotels.rows[0]?.n ?? 0,
        attractions: attractions.rows[0]?.n ?? 0,
      }
    } finally {
      await pool.end()
    }
  } catch (error: any) {
    let hint =
      'Run `npm run db:check`. For Neon, set DATABASE_URL in `.env`. For Docker, run `npm run db:use-docker`.'

    if (error?.code === '28P01') {
      hint =
        'Authentication failed. If using Docker on Windows, run `npm run db:use-docker`. For Neon, copy a fresh connection string from the Neon dashboard into `.env`.'
    } else if (target.port === '5432' && target.provider === 'docker-local') {
      hint =
        'Port 5432 on Windows is often a different PostgreSQL install. Run `npm run db:use-docker` to switch to Docker on port 5433.'
    }

    return {
      ok: false,
      host: target.host,
      database: target.database,
      user: target.user,
      hotels: 0,
      attractions: 0,
      error: error?.message || String(error),
      hint,
    }
  }
}
