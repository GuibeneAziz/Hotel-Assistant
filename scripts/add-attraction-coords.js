require('./load-env')
const { getPoolOptions } = require('./load-env')
const { Pool } = require('pg')

const pool = new Pool(getPoolOptions())

async function run() {
  const client = await pool.connect()
  try {
    await client.query(
      'ALTER TABLE nearby_attractions ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION'
    )
    await client.query(
      'ALTER TABLE nearby_attractions ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION'
    )
    console.log('✅ Added latitude and longitude columns to nearby_attractions')

    const check = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'nearby_attractions'
        AND column_name IN ('latitude', 'longitude')
      ORDER BY column_name
    `)
    console.log('Verified columns:', check.rows)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
