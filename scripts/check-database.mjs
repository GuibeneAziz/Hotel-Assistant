#!/usr/bin/env node
/**
 * Verify PostgreSQL connectivity using the same env resolution as the app.
 */
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse as parseDotenv } from 'dotenv'
import pg from 'pg'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function getMergedEnv() {
  const merged = {}
  for (const fileName of ['.env', '.env.local', '.env.development', '.env.development.local']) {
    const filePath = path.join(root, fileName)
    if (existsSync(filePath)) Object.assign(merged, parseDotenv(readFileSync(filePath)))
  }
  return merged
}

function resolveDatabaseUrl(merged) {
  let url = (merged.DATABASE_URL || '').trim()
  if (!url && merged.POSTGRES_USER && merged.POSTGRES_PASSWORD && merged.POSTGRES_DB) {
    const port = merged.POSTGRES_PORT || '5433'
    url = `postgresql://${encodeURIComponent(merged.POSTGRES_USER)}:${encodeURIComponent(merged.POSTGRES_PASSWORD)}@localhost:${port}/${merged.POSTGRES_DB}`
  }
  if (!url) throw new Error('DATABASE_URL missing — set in .env (Neon) or run npm run db:use-docker')
  if (url.includes('@postgres:')) {
    const port = merged.POSTGRES_PORT || '5433'
    url = url.replace('@postgres:', `@localhost:${port}:`)
  }
  return url
}

const merged = getMergedEnv()
const url = resolveDatabaseUrl(merged)
const target = new URL(url.replace(/^postgresql:/, 'http:'))
const provider = /neon\.tech/i.test(target.hostname)
  ? 'Neon (cloud)'
  : target.hostname === 'localhost'
    ? 'local Docker'
    : target.hostname

console.log(`\n🔌 Database target: ${target.username}@${target.hostname}:${target.port || '5432'}/${target.pathname.replace(/^\//, '').split('?')[0]}`)
console.log(`   Provider: ${provider}`)

const ssl =
  merged.DATABASE_SSL === 'true' ||
  (/neon\.tech|sslmode=require/i.test(url) && merged.DATABASE_SSL !== 'false')

const pool = new pg.Pool({
  connectionString: url,
  ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  connectionTimeoutMillis: 10000,
  max: 1,
})

try {
  const [{ rows: hotels }, { rows: attractions }, { rows: byHotel }] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS n FROM hotels'),
    pool.query('SELECT COUNT(*)::int AS n FROM nearby_attractions'),
    pool.query(
      'SELECT hotel_id, COUNT(*)::int AS n FROM nearby_attractions GROUP BY hotel_id ORDER BY hotel_id'
    ),
  ])

  console.log('✅ Connected successfully')
  console.log(`   Hotels: ${hotels[0].n}`)
  console.log(`   Nearby attractions: ${attractions[0].n}`)
  if (byHotel.length > 0) {
    console.log('   Per hotel:')
    for (const row of byHotel) console.log(`     - ${row.hotel_id}: ${row.n}`)
  }

  if (attractions[0].n === 0) {
    console.warn('\n⚠️  No attractions in database — run: npm run db:seed')
    process.exit(1)
  }

  if (target.hostname === 'localhost' && (target.port || '5432') === '5432') {
    console.warn('\n⚠️  Port 5432 on Windows is often NOT Docker. Run: npm run db:use-docker')
    process.exit(1)
  }

  console.log('\n🎉 Database is ready for npm run dev\n')
} catch (error) {
  console.error(`\n❌ Connection failed: ${error.message}`)
  if (error.code === '28P01') {
    console.error('   → Run npm run db:use-neon (Neon) or npm run db:use-docker (local Docker)')
  }
  process.exit(1)
} finally {
  await pool.end()
}
