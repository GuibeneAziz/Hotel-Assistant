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

function getEnv() {
  const filePath = path.join(root, '.env')
  return existsSync(filePath) ? parseDotenv(readFileSync(filePath)) : {}
}

function resolveDatabaseUrl(merged) {
  let url = (merged.DATABASE_URL || '').trim()
  if (!url && merged.POSTGRES_USER && merged.POSTGRES_PASSWORD && merged.POSTGRES_DB) {
    const host = merged.POSTGRES_HOST || 'localhost'
    const port = merged.POSTGRES_PORT || (host === 'postgres' ? '5432' : '5433')
    url = `postgresql://${encodeURIComponent(merged.POSTGRES_USER)}:${encodeURIComponent(merged.POSTGRES_PASSWORD)}@${host}:${port}/${merged.POSTGRES_DB}`
  }
  if (!url) {
    throw new Error('DATABASE_URL missing — copy .env.example to .env and configure the database section')
  }
  if (url.includes('@postgres:')) {
    const port = merged.POSTGRES_PORT || '5433'
    url = url.replace('@postgres:', `@localhost:${port}:`)
  }
  return url
}

const merged = getEnv()
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
    console.warn('\n⚠️  Port 5432 on Windows is often NOT Docker. Set POSTGRES_PORT=5433 in .env')
    process.exit(1)
  }

  console.log('\n🎉 Database is ready for npm run dev\n')
} catch (error) {
  console.error(`\n❌ Connection failed: ${error.message}`)
  if (error.code === '28P01') {
    console.error('   → Check DATABASE_URL and POSTGRES_* credentials in .env (see .env.example)')
  }
  process.exit(1)
} finally {
  await pool.end()
}
