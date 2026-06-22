#!/usr/bin/env node
/**
 * Align .env.local DATABASE_URL with Docker Postgres (localhost:5433).
 * Does not print passwords. Usage: npm run db:sync-env
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

let lines = []
if (existsSync(envLocalPath)) {
  lines = readFileSync(envLocalPath, 'utf8').split(/\r?\n/)
} else {
  lines = ['# Local development — synced by npm run db:sync-env', '']
}

let replaced = false
const nextLines = lines.map((line) => {
  if (line.startsWith('DATABASE_URL=')) {
    replaced = true
    return `DATABASE_URL=${databaseUrl}`
  }
  return line
})

if (!replaced) {
  nextLines.push(`DATABASE_URL=${databaseUrl}`)
}

if (!nextLines.some((l) => l.startsWith('DATABASE_SSL='))) {
  nextLines.push('DATABASE_SSL=false')
}

if (!nextLines.some((l) => l.startsWith('POSTGRES_PORT='))) {
  nextLines.push(`POSTGRES_PORT=${port}`)
}

writeFileSync(envLocalPath, nextLines.filter((l, i, arr) => !(i === arr.length - 1 && l === '')).join('\n') + '\n', 'utf8')

console.log(`✅ Updated ${path.basename(envLocalPath)}`)
console.log(`   DATABASE_URL → localhost:${port}/${db} (user: ${user})`)
console.log('   Restart npm run dev, then run: npm run db:check')
