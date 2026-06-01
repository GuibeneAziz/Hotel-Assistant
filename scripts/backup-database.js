// Backup Database to JSON
// Run: node scripts/backup-database.js

const { Client } = require('pg')
const { writeFileSync } = require('fs')
const { join } = require('path')
require('dotenv').config({ path: '.env.local' })

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function backup() {
  try {
    console.log('🔄 Starting database backup...\n')
    await client.connect()

    const backup = {
      timestamp: new Date().toISOString(),
      hotels: [],
      facilities: [],
      contact_info: [],
      amenities: [],
      special_events: [],
      activities: []
    }

    // Backup each table
    const tables = Object.keys(backup).filter(k => k !== 'timestamp')
    
    for (const table of tables) {
      const result = await client.query(`SELECT * FROM ${table}`)
      backup[table] = result.rows
      console.log(`✅ Backed up ${table}: ${result.rows.length} rows`)
    }

    // Save to file
    const filename = `backup-${new Date().toISOString().split('T')[0]}.json`
    const filepath = join(process.cwd(), 'backups', filename)
    
    // Create backups directory if it doesn't exist
    const fs = require('fs')
    const backupsDir = join(process.cwd(), 'backups')
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir)
    }
    
    writeFileSync(filepath, JSON.stringify(backup, null, 2))
    
    console.log(`\n✨ Backup completed!`)
    console.log(`📁 Saved to: ${filepath}`)

  } catch (error) {
    console.error('❌ Backup failed:', error)
  } finally {
    await client.end()
  }
}

backup()
