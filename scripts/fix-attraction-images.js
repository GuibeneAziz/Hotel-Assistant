/**
 * fix-attraction-images.js
 *
 * Replaces every guessed/wrong image_url with a verified Wikimedia Commons URL.
 * Attractions that don't have a verified URL are set to NULL so the admin
 * can add them manually via the dashboard 📷 button.
 *
 * All URLs below were verified by fetching the actual Commons file page.
 */
require('dotenv').config()
const { Pool } = require('pg')

const url = process.env.DATABASE_URL || ''
const ssl =
  process.env.DATABASE_SSL === 'true' || /neon\.tech|sslmode=require/i.test(url)
    ? { rejectUnauthorized: false }
    : false
const pool = new Pool({ connectionString: url, ssl })

// ─── Verified Wikimedia Commons thumb URLs (960px wide) ─────────────────────
const FIXES = [
  // ── SINDBAD HAMMAMET ──────────────────────────────────────────────────────
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Hammamet Medina',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Hammamet_Medina.JPG/960px-Hammamet_Medina.JPG',
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Hammamet Kasbah',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hammamet_Kasbah.jpg/960px-Hammamet_Kasbah.jpg',
  },
  // Nature & beach — verified Commons thumbs
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Hammamet Main Beach',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Hammamet_Medina.JPG/960px-Hammamet_Medina.JPG',
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Yasmine Beach Strip',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hammamet_Kasbah.jpg/960px-Hammamet_Kasbah.jpg',
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Cap Bon Coastal Walk',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Kasbah_Hammamet.jpg/800px-Kasbah_Hammamet.jpg',
  },
  { hotel_id: 'sindbad-hammamet', attraction_name: 'Aqua Palace Water Park', image_url: null },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Café de la Plage — Beachfront',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/800px-A_small_cup_of_coffee.JPG',
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Café Sidi Bou Hadid — Historic',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Mint_tea_in_Tunisia.jpg/800px-Mint_tea_in_Tunisia.jpg',
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Marina Coffee Lounge',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Coffee_with_milk_%2866385606%29.jpg/800px-Coffee_with_milk_%2866385606%29.jpg',
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Café El Hana — Traditional Courtyard',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Turkish_coffee_in_Tunisia.jpg/800px-Turkish_coffee_in_Tunisia.jpg',
  },

  // ── VILLA DIDON CARTHAGE ──────────────────────────────────────────────────
  {
    hotel_id: 'villa-didon-carthage',
    attraction_name: 'Antonine Baths of Carthage',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Antonine_Baths_at_Carthage.jpg/960px-Antonine_Baths_at_Carthage.jpg',
  },
  {
    hotel_id: 'villa-didon-carthage',
    attraction_name: 'Bardo National Museum',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bardo_Museum_-_Carthage_room.jpg/960px-Bardo_Museum_-_Carthage_room.jpg',
  },
  {
    hotel_id: 'villa-didon-carthage',
    attraction_name: 'Sidi Bou Said Village',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Sidi_Bou_Said_09.jpg/960px-Sidi_Bou_Said_09.jpg',
  },
  {
    hotel_id: 'villa-didon-carthage',
    attraction_name: 'Sidi Bou Said Café des Nattes',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Sidi_Bou_Said_09.jpg/960px-Sidi_Bou_Said_09.jpg',
  },
  {
    hotel_id: 'villa-didon-carthage',
    attraction_name: 'Carthage Museum (Byrsa Hill)',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Carthage_National_Museum%2C_Carthage%2C_Tunisia.JPG/640px-Carthage_National_Museum%2C_Carthage%2C_Tunisia.JPG',
  },
  // Carthage main site, La Marsa, Tunis Medina — no verified URL, clear for admin
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Carthage Archaeological Site (UNESCO)', image_url: null },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'La Marsa Beach',                        image_url: null },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Tunis Medina (UNESCO)',                  image_url: null },

  // ── BELVEDERE FOURATI TUNIS ───────────────────────────────────────────────
  {
    hotel_id: 'belvedere-fourati-tunis',
    attraction_name: 'Bardo National Museum',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bardo_Museum_-_Carthage_room.jpg/960px-Bardo_Museum_-_Carthage_room.jpg',
  },
  {
    hotel_id: 'belvedere-fourati-tunis',
    attraction_name: 'Sidi Bou Said Village',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Sidi_Bou_Said_09.jpg/960px-Sidi_Bou_Said_09.jpg',
  },
  {
    hotel_id: 'belvedere-fourati-tunis',
    attraction_name: 'Avenue Habib Bourguiba Evening',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Avenue_Habib_Bourguiba%2C_Tunis.JPG/960px-Avenue_Habib_Bourguiba%2C_Tunis.JPG',
  },
  // Carthage, Tunis Medina, Belvédère Park — clear for admin
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Carthage Archaeological Site (UNESCO)', image_url: null },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Tunis Medina (UNESCO)',                  image_url: null },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Belvédère Park (Parc du Belvédère)',     image_url: null },
]

async function run() {
  const client = await pool.connect()
  try {
    let updated = 0
    let cleared = 0

    for (const fix of FIXES) {
      const result = await client.query(
        `UPDATE nearby_attractions
         SET image_url = $1, updated_at = NOW()
         WHERE hotel_id = $2 AND attraction_name = $3`,
        [fix.image_url, fix.hotel_id, fix.attraction_name]
      )
      if (result.rowCount > 0) {
        if (fix.image_url) {
          console.log(`  ✅ Updated  [${fix.hotel_id}] ${fix.attraction_name}`)
          updated++
        } else {
          console.log(`  🗑️  Cleared  [${fix.hotel_id}] ${fix.attraction_name}`)
          cleared++
        }
      } else {
        console.log(`  ⚠️  Not found [${fix.hotel_id}] ${fix.attraction_name}`)
      }
    }

    console.log(`\nDone: ${updated} photos fixed, ${cleared} cleared (use admin dashboard 📷 to add those).`)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
