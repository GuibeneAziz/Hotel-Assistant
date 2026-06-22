#!/usr/bin/env node
/**
 * Point local dev at Docker Postgres on localhost:5433 (Windows-safe).
 * Usage: npm run db:use-docker
 */
import { config, parse } from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envLocalPath = path.join(root, '.env.local')
const envPath = path.join(root, '.env')

const merged = {}
if (existsSync(envPath)) Object.assign(merged, parse(readFileSync(envPath)))
if (existsSync(envLocalPath)) Object.assign(merged, parse(readFileSync(envLocalPath)))

const user = merged.POSTGRES_USER || 'hotel'
const password = merged.POSTGRES_PASSWORD || 'hotel_secret_change_me'
const db = merged.POSTGRES_DB || 'hotel_assistant'
const port = merged.POSTGRES_PORT || '5433'

const databaseUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:${port}/${db}`

let lines = existsSync(envLocalPath)
  ? readFileSync(envLocalPath, 'utf8').split(/\r?\n/)
  : ['# Local development overrides']

const keysToSet = {
  DATABASE_URL: databaseUrl,
  DATABASE_SSL: 'false',
  POSTGRES_USER: user,
  POSTGRES_PASSWORD: password,
  POSTGRES_DB: db,
  POSTGRES_PORT: port,
}

const seen = new Set()
lines = lines.map((line) => {
  const key = line.split('=')[0]?.trim()
  if (key && keysToSet[key]) {
    seen.add(key)
    return `${key}=${keysToSet[key]}`
  }
  return line
})

for (const [key, value] of Object.entries(keysToSet)) {
  if (!seen.has(key)) lines.push(`${key}=${value}`)
}

writeFileSync(envLocalPath, lines.join('\n').replace(/\n+$/, '') + '\n', 'utf8')

console.log('✅ .env.local configured for Docker Postgres')
console.log(`   DATABASE_URL → localhost:${port}/${db} (user: ${user})`)
console.log('   Start DB: docker compose up -d postgres redis')
console.log('   Seed data: npm run db:seed')
console.log('   Verify: npm run db:check')
