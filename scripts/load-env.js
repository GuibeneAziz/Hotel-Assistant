/**
 * Load .env files in Next.js order and normalize DATABASE_URL for host scripts.
 */
const path = require('path')
const { existsSync, readFileSync } = require('fs')
const { parse } = require('dotenv')

const root = path.join(__dirname, '..')
const merged = {}
for (const fileName of ['.env', '.env.local', '.env.development', '.env.development.local']) {
  const filePath = path.join(root, fileName)
  if (existsSync(filePath)) Object.assign(merged, parse(readFileSync(filePath)))
}

for (const [key, value] of Object.entries(merged)) {
  if (process.env[key] === undefined) process.env[key] = value
}

const DEFAULT_DOCKER_PORT = merged.POSTGRES_PORT || '5433'

function buildUrlFromParts() {
  const user = merged.POSTGRES_USER
  const password = merged.POSTGRES_PASSWORD
  const db = merged.POSTGRES_DB
  if (!user || !password || !db) return null
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:${DEFAULT_DOCKER_PORT}/${db}`
}

let url = (merged.DATABASE_URL || '').trim() || buildUrlFromParts() || ''
if (url.includes('@postgres:')) {
  url = url.replace('@postgres:', `@localhost:${DEFAULT_DOCKER_PORT}:`)
}
if (url) process.env.DATABASE_URL = url

function getPoolOptions() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing — run npm run db:use-neon or npm run db:use-docker')
  }
  const ssl =
    merged.DATABASE_SSL === 'true' ||
    (/neon\.tech|sslmode=require/i.test(connectionString) && merged.DATABASE_SSL !== 'false')
      ? { rejectUnauthorized: false }
      : false
  return { connectionString, ssl }
}

module.exports = { getPoolOptions }
