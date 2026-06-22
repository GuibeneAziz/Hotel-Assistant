#!/usr/bin/env node
/**
 * Point local dev at Neon (real cloud data in .env).
 * Removes Docker DATABASE_URL overrides from .env.local so .env wins.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envLocalPath = path.join(root, '.env.local')

const STRIP_KEYS = new Set([
  'DATABASE_URL',
  'DATABASE_SSL',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'POSTGRES_PORT',
  'POSTGRES_HOST',
])

let lines = existsSync(envLocalPath)
  ? readFileSync(envLocalPath, 'utf8').split(/\r?\n/)
  : []

lines = lines.filter((line) => {
  const key = line.split('=')[0]?.trim()
  return !STRIP_KEYS.has(key)
})

if (!lines.some((l) => l.includes('Neon / Docker database'))) {
  lines.unshift(
    '# Database: using DATABASE_URL from .env (Neon). For local Docker instead: npm run db:use-docker'
  )
}

writeFileSync(envLocalPath, lines.join('\n').replace(/\n+$/, '') + '\n', 'utf8')

config({ path: path.join(root, '.env') })
if (existsSync(envLocalPath)) config({ path: envLocalPath, override: true })

const url = process.env.DATABASE_URL || ''
let host = 'missing'
try {
  const u = new URL(url.replace(/^postgresql:/, 'http:'))
  host = u.hostname
} catch {
  /* ignore */
}

console.log('✅ .env.local no longer overrides DATABASE_URL')
console.log(`   Active database host: ${host}`)
console.log('   Run: npm run db:check')
