/**
 * Load the single .env file for Node scripts (same source as the Next.js app).
 */
const path = require('path')
const { existsSync, readFileSync } = require('fs')
const { parse } = require('dotenv')

const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env')

const merged = existsSync(envPath) ? parse(readFileSync(envPath)) : {}

for (const [key, value] of Object.entries(merged)) {
  if (process.env[key] === undefined) process.env[key] = value
}

const DEFAULT_DOCKER_PORT = merged.POSTGRES_PORT || '5433'

function buildUrlFromParts() {
  const user = merged.POSTGRES_USER
  const password = merged.POSTGRES_PASSWORD
  const db = merged.POSTGRES_DB
  if (!user || !password || !db) return null
  const host = merged.POSTGRES_HOST || 'localhost'
  const port = host === 'postgres' ? '5432' : DEFAULT_DOCKER_PORT
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`
}

let url = (merged.DATABASE_URL || '').trim() || buildUrlFromParts() || ''
if (url.includes('@postgres:')) {
  url = url.replace('@postgres:', `@localhost:${DEFAULT_DOCKER_PORT}:`)
}
if (url) process.env.DATABASE_URL = url

function getPoolOptions() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing — copy .env.example to .env and configure the database section')
  }
  const ssl =
    merged.DATABASE_SSL === 'true' ||
    (/neon\.tech|sslmode=require/i.test(connectionString) && merged.DATABASE_SSL !== 'false')
      ? { rejectUnauthorized: false }
      : false
  return { connectionString, ssl }
}

module.exports = { getPoolOptions, merged }
