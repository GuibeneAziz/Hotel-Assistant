#!/usr/bin/env node
/**
 * One-shot seed for Docker Compose: runs only when the DB is empty or incomplete.
 * Invoked by the `seed` service before the app starts.
 */
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL is required')
  process.exit(1)
}

const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
const pool = new pg.Pool({ connectionString, ssl, max: 1 })

async function tableCount(table) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`)
  return rows[0]?.n ?? 0
}

async function needsSeed() {
  const hotels = await tableCount('hotels')
  const attractions = await tableCount('nearby_attractions')
  const facilities = await tableCount('facilities')

  if (hotels === 0) {
    console.log('ℹ️  No hotels found — schema may not be initialized yet.')
    return true
  }

  if (attractions < 20 || facilities < 10) {
    console.log(
      `ℹ️  Incomplete data (hotels=${hotels}, attractions=${attractions}, facilities=${facilities}) — seeding…`
    )
    return true
  }

  console.log(`✅ Database already seeded (${hotels} hotels, ${attractions} attractions). Skipping.`)
  return false
}

async function runScript(name) {
  const { spawnSync } = await import('child_process')
  console.log(`\n▶ Running ${name}…`)
  const result = spawnSync('node', [`scripts/${name}`], {
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    throw new Error(`${name} exited with code ${result.status}`)
  }
}

async function main() {
  try {
    await pool.query('SELECT 1')

    if (!(await needsSeed())) {
      return
    }

    await runScript('seed-hotel-settings.js')
    await runScript('seed-attractions.js')
    console.log('\n🎉 Docker seed complete.')
  } catch (error) {
    console.error('❌ Seed failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
