/**
 * fetch-attractions.js
 *
 * Hybrid data pipeline — two specialised sources, best of each:
 *
 *   Foursquare Places API  → restaurant, cafe, entertainment, shopping
 *   OpenTripMap API        → cultural, nature, adventure  (+ fallback below)
 *   Built-in curated list  → static fallback when no API keys are given
 *
 * Why the split?
 *   Foursquare has real user ratings and accurate business data for
 *   restaurants/cafes/entertainment. OpenTripMap (OSM) is better for
 *   historic/cultural/natural sites.
 *
 * Usage:
 *   node scripts/fetch-attractions.js <hotelId> [radiusKm] [otmKey] [fsqKey]
 *
 * Environment variables (alternative to passing keys as args):
 *   OPENTRIPMAP_API_KEY=...
 *   FOURSQUARE_API_KEY=...
 *
 * Examples:
 *   node scripts/fetch-attractions.js villa-didon-carthage 15 OTM_KEY FSQ_KEY
 *   node scripts/fetch-attractions.js sindbad-hammamet           # static fallback
 *
 * NOTE: Run scripts/add-attraction-coords.js first to ensure the
 *       latitude/longitude columns exist in nearby_attractions.
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { Pool } = require('pg')

const HOTEL_ID  = process.argv[2]
const RADIUS_KM = parseInt(process.argv[3] || '15', 10)
const OTM_KEY   = process.argv[4] || process.env.OPENTRIPMAP_API_KEY || null
const FSQ_KEY   = process.argv[5] || process.env.FOURSQUARE_API_KEY   || null

if (!HOTEL_ID) {
  console.error('Usage: node scripts/fetch-attractions.js <hotelId> [radiusKm] [otmKey] [fsqKey]')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

// ─── Utilities ────────────────────────────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distText(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function getDefaults(category, distKm) {
  const transport = distKm > 15 ? 'Taxi / Hotel shuttle' : distKm > 5 ? 'Taxi' : 'Walking / Taxi'
  const base = { price_range: 'Free', estimated_duration: '1-2 hours', transportation: transport }
  if (category === 'cultural')      return { ...base, estimated_duration: '1-3 hours' }
  if (category === 'nature')        return { ...base, estimated_duration: '2-4 hours' }
  if (category === 'adventure')     return { ...base, estimated_duration: '2-4 hours', price_range: '20-80 TND' }
  if (category === 'entertainment') return { ...base, estimated_duration: '2-3 hours', price_range: '10-40 TND' }
  if (category === 'restaurant')    return { ...base, estimated_duration: '1-2 hours', price_range: '15-60 TND' }
  if (category === 'cafe')          return { ...base, estimated_duration: '30min-1h',  price_range: '5-20 TND' }
  if (category === 'shopping')      return { ...base, estimated_duration: '1-3 hours' }
  return base
}

// Convert Foursquare price tier (1-4) to a TND price range string
function fsqPriceToDnd(tier) {
  if (!tier) return null
  if (tier === 1) return 'Under 15 TND'
  if (tier === 2) return '15-40 TND'
  if (tier === 3) return '40-80 TND'
  return '80+ TND'
}

// ─── Foursquare Places API ────────────────────────────────────────────────────
// Used for: restaurant, cafe, entertainment, shopping
// Foursquare v3 category IDs used:
//   13065 → Restaurant     13032 → Café/Coffee Shop
//   13000 → Food & Drink   10000 → Arts & Entertainment
//   10027 → Movie Theater  10024 → Music Venue
//   10013 → Casino         17000 → Retail / Shopping
//   17069 → Shopping Mall

const FSQ_CATEGORY_MAP = {
  restaurant:    { ids: '13065,13000', label: 'restaurant' },
  cafe:          { ids: '13032,13040', label: 'cafe' },
  entertainment: { ids: '10000,10027,10024,10013', label: 'entertainment' },
  shopping:      { ids: '17000,17069', label: 'shopping' },
}

async function fetchFromFoursquare(lat, lon, radiusKm) {
  console.log('\n🟣 Foursquare Places API — fetching restaurant / café / entertainment / shopping...')
  const results = []

  for (const [ourCategory, { ids, label }] of Object.entries(FSQ_CATEGORY_MAP)) {
    const url = new URL('https://places-api.foursquare.com/places/search')
    url.searchParams.set('ll', `${lat},${lon}`)
    url.searchParams.set('radius', String(radiusKm * 1000))
    url.searchParams.set('fsq_category_ids', ids)
    url.searchParams.set('limit', '50')
    url.searchParams.set('fields', 'name,geocodes,categories,distance,location,rating,price,description')
    url.searchParams.set('sort', 'RATING')   // highest-rated first

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${FSQ_KEY}`,
        'X-Places-Api-Version': '2025-06-17',
      },
    })

    if (res.status === 401) throw new Error('Invalid Foursquare API key.')
    if (!res.ok) {
      const errBody = await res.text().catch(() => '(no body)')
      throw new Error(`Foursquare error ${res.status} for category ${label}: ${errBody}`)
    }

    const data = await res.json()
    const places = data.results || []
    console.log(`  ✅ ${places.length} ${label} places found`)

    for (const p of places) {
      if (!p.name) continue
      const placeLat = p.geocodes?.main?.latitude
      const placeLon = p.geocodes?.main?.longitude
      if (!placeLat || !placeLon) continue

      // Build a description from available fields
      let description = p.description || null
      if (!description && p.location?.address) {
        description = `${p.name} — located at ${p.location.address}${p.location.locality ? ', ' + p.location.locality : ''}.`
      }
      if (!description) {
        description = `${p.name} — a popular ${label} near the hotel.`
      }

      // Append rating if available
      if (p.rating) {
        description += ` Rated ${p.rating.toFixed(1)}/10 by visitors.`
      }

      results.push({
        name: p.name,
        description,
        category: ourCategory,
        lat: placeLat,
        lon: placeLon,
        extra: {
          price_range: fsqPriceToDnd(p.price) || undefined,
        },
      })
    }

    // Brief pause between category requests
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`  📦 Foursquare total: ${results.length} places across 4 categories`)
  return results
}

// ─── OpenTripMap API ──────────────────────────────────────────────────────────
// Used for: cultural, nature, adventure only

const OTM_KINDS = {
  museums: 'cultural', historic: 'cultural', archaeology: 'cultural',
  religion: 'cultural', architecture: 'cultural', cultural: 'cultural',
  natural: 'nature', beaches: 'nature', nature_reserves: 'nature',
  gardens_and_parks: 'nature', water: 'nature',
  sport: 'adventure', amusements: 'adventure',
}

// Only the kinds that map to cultural / nature / adventure
const OTM_KINDS_QUERY = 'museums,historic,archaeology,religion,cultural,natural,beaches,nature_reserves,gardens_and_parks,sport'

function otmKindToCategory(kinds) {
  if (!kinds) return null
  for (const k of kinds.split(',')) {
    const cat = OTM_KINDS[k.trim()]
    if (cat) return cat
  }
  return null // null = skip this entry (entertainment/shopping handled by Foursquare)
}

async function fetchFromOpenTripMap(lat, lon, radiusKm) {
  console.log('\n🟡 OpenTripMap API — fetching cultural / nature / adventure...')
  const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radiusKm * 1000}&lon=${lon}&lat=${lat}&kinds=${OTM_KINDS_QUERY}&apikey=${OTM_KEY}&limit=200&format=json`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (res.status === 401) throw new Error('Invalid OpenTripMap API key.')
  if (!res.ok) throw new Error(`OpenTripMap error: ${res.status}`)
  const features = await res.json()
  console.log(`  ✅ ${features.length} places found via OpenTripMap`)

  const results = []
  for (const f of features) {
    const { name, kinds, xid } = f.properties
    if (!name) continue
    const category = otmKindToCategory(kinds)
    if (!category) continue // skip non-cultural/nature/adventure

    let description = null
    try {
      const detail = await fetch(`https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${OTM_KEY}`)
      if (detail.ok) {
        const d = await detail.json()
        description = d?.wikipedia_extracts?.text || d?.info?.descr || null
      }
      await new Promise(r => setTimeout(r, 150))
    } catch { /* skip detail fetch errors silently */ }

    results.push({
      name,
      description,
      category,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    })
  }

  return results
}

// ─── Built-in curated Tunisian dataset ───────────────────────────────────────

const DATASET = [
  { name: 'Hammamet Medina', lat: 36.3990, lon: 10.6144, category: 'cultural', description: 'The old medina of Hammamet is one of the best-preserved in Tunisia, surrounded by imposing walls and featuring a 15th-century kasbah with stunning sea views. Narrow alleyways lined with craft shops, jasmine flowers and traditional whitewashed houses.', price_range: 'Free' },
  { name: 'Hammamet Kasbah', lat: 36.3987, lon: 10.6147, category: 'cultural', description: 'A historic fortress dating back to the 15th century, perched above the sea. Offers panoramic views of the bay and the medina, with a small museum of local history.', price_range: '3 TND' },
  { name: 'Pupput Roman Site', lat: 36.4050, lon: 10.6330, category: 'cultural', description: 'Archaeological site of the ancient Roman town of Pupput, featuring mosaics, baths, and ruins from the 2nd century AD. One of the most significant Roman vestiges on the Cap Bon peninsula.', price_range: '8 TND' },
  { name: 'Hammamet Beach', lat: 36.4010, lon: 10.6060, category: 'nature', description: 'A beautiful white-sand beach stretching along the Gulf of Hammamet, famous for its clear turquoise waters and gentle waves. Perfect for swimming and water sports.', price_range: 'Free' },
  { name: 'Carthageland Theme Park', lat: 36.4088, lon: 10.6215, category: 'entertainment', description: 'The largest theme park in North Africa, with thrilling rides, water slides, medieval-themed areas, live shows, and restaurants. A full-day destination for families.', price_range: '40-80 TND' },
  { name: 'Yasmine Hammamet Marina', lat: 36.4128, lon: 10.6202, category: 'entertainment', description: 'A modern marina with upscale restaurants, boutique shops, miniature golf, and a lively promenade with sea views.', price_range: 'Free (entry)' },
  { name: 'Nabeul Pottery Market', lat: 36.4561, lon: 10.7356, category: 'shopping', description: 'Nabeul is the pottery capital of Tunisia. The Friday market overflows with hand-painted ceramics, glazed pots, mosaic tiles, and embroidered textiles at factory prices.', price_range: 'Free entry' },
  { name: 'Ain Tounine Waterfall', lat: 36.6200, lon: 10.9800, category: 'nature', description: 'A natural spring and waterfall nestled in the forested hills of Cap Bon, surrounded by pine trees and wildflowers. Popular for picnics and nature walks.', price_range: 'Free' },
  { name: 'Cap Bon Lighthouse', lat: 37.0846, lon: 11.0386, category: 'nature', description: 'The northernmost tip of Tunisia, with dramatic clifftops and views across to Sicily on clear days. A scenic drive through vineyards leads to this wild cape.', price_range: 'Free' },
  { name: 'Sousse Medina', lat: 35.8285, lon: 10.6386, category: 'cultural', description: 'A UNESCO World Heritage Site, the 9th-century medina of Sousse contains the Ribat fortress, Great Mosque, and labyrinthine souks selling carpets, spices, and leather goods.', price_range: 'Free (medina), 8 TND (Ribat)' },
  { name: 'Ribat of Sousse', lat: 35.8286, lon: 10.6389, category: 'cultural', description: 'A well-preserved Islamic fortress built in 821 AD. Climb the watchtower for panoramic views over the medina and sea.', price_range: '8 TND' },
  { name: 'Museum of Sousse', lat: 35.8271, lon: 10.6378, category: 'cultural', description: 'Housed in the kasbah, this museum contains one of the finest collections of Roman mosaics in the world, alongside Punic artifacts and early Christian objects.', price_range: '8 TND' },
  { name: 'Port El Kantaoui', lat: 35.8942, lon: 10.5959, category: 'entertainment', description: 'An upscale marina resort 8 km north of Sousse, featuring a yacht harbour, golf course, casino, water sports center, and restaurants.', price_range: 'Free (entry)' },
  { name: 'Friguia Park', lat: 36.0900, lon: 10.5200, category: 'entertainment', description: 'A 90-hectare safari and amusement park with lions, elephants, giraffes, and zebras. Guided Jeep safaris, water park, and train rides.', price_range: '35-60 TND' },
  { name: 'El Abassia Beach Sousse', lat: 35.8200, lon: 10.6300, category: 'nature', description: 'A long sandy beach south of Sousse with calm waters and family-friendly atmosphere. Sunbed rentals and cafes along the shore.', price_range: 'Free' },
  { name: 'Ribat of Monastir', lat: 35.7717, lon: 10.8317, category: 'cultural', description: "One of the best-preserved Islamic ribats in the world (796 AD). Featured in Monty Python's Life of Brian. The watchtower offers spectacular sea views.", price_range: '8 TND' },
  { name: 'Bourguiba Mausoleum', lat: 35.7692, lon: 10.8307, category: 'cultural', description: "The golden-domed mausoleum of Tunisia's first president. Features intricate Islamic architecture, marble interiors, and stained glass windows.", price_range: 'Free' },
  { name: 'Monastir Marina', lat: 35.7757, lon: 10.8356, category: 'entertainment', description: 'A lively marina with fishing boats, luxury yachts, seafood restaurants, and evening promenades with sea views.', price_range: 'Free' },
  { name: 'Carthage Archaeological Site', lat: 36.8525, lon: 10.3233, category: 'cultural', description: 'UNESCO World Heritage Site. Ruins of the ancient city including Antonine Baths, the Tophet, Punic ports, and a Roman theatre.', price_range: '12 TND' },
  { name: 'Bardo National Museum', lat: 36.8094, lon: 10.1331, category: 'cultural', description: "The world's largest collection of Roman mosaics, housed in a 19th-century palace. Also contains Punic, Islamic, and Byzantine collections.", price_range: '11 TND' },
  { name: 'Tunis Medina', lat: 36.7992, lon: 10.1706, category: 'cultural', description: 'UNESCO World Heritage Site. One of the oldest Islamic cities in North Africa, containing over 700 monuments. The Great Mosque of the Zitouna dates back to the 8th century.', price_range: 'Free (medina)' },
  { name: 'Sidi Bou Said', lat: 36.8693, lon: 10.3406, category: 'cultural', description: 'A picturesque clifftop village with blue and white architecture, cobblestone streets, and panoramic views over the Bay of Tunis. Home to art galleries and the legendary Café des Nattes.', price_range: 'Free (village)' },
  { name: 'Gammarth Beach', lat: 36.9069, lon: 10.2836, category: 'nature', description: 'A long sandy beach north of Tunis with upscale resorts and calm Mediterranean waters. Popular for swimming and water sports.', price_range: 'Free' },
  { name: 'El Ghriba Synagogue Djerba', lat: 33.8033, lon: 10.8611, category: 'cultural', description: 'One of the oldest synagogues in the world (over 2500 years old). A major pilgrimage site with beautiful blue and yellow tile work.', price_range: '3 TND' },
  { name: 'Houmt Souk Medina Djerba', lat: 33.8761, lon: 10.8592, category: 'shopping', description: "Djerba's main market town with a lively souk selling pottery, woven blankets, silver jewellery, spices, and local crafts.", price_range: 'Free' },
  { name: 'Djerba Lagoon', lat: 33.8000, lon: 10.9000, category: 'nature', description: 'A vast shallow lagoon on the west coast of Djerba, home to flamingos, herons, and migratory birds. A paradise for birdwatchers and photographers.', price_range: 'Free' },
  { name: 'Sahara Desert Dunes Douz', lat: 33.4592, lon: 9.0236, category: 'adventure', description: 'Gateway to the Sahara. Camel rides, quad biking, 4x4 excursions across golden dunes, and overnight desert camps under the stars.', price_range: '80-250 TND' },
  { name: 'Matmata Troglodyte Village', lat: 33.5444, lon: 9.9678, category: 'cultural', description: "Unique Berber settlement where inhabitants live in traditional pit-houses carved into the earth. The Sidi Driss hotel served as Luke Skywalker's home in the original Star Wars.", price_range: '5 TND' },
  { name: 'Ong Jemel Sahara Rock', lat: 33.5050, lon: 7.8480, category: 'nature', description: "A dramatic rock formation resembling a camel's neck, surrounded by an oasis and golden dunes. Setting for several Star Wars scenes.", price_range: 'Free' },
]

function getStaticAttractions(lat, lon, radiusKm) {
  return DATASET
    .map(a => ({ ...a, distKm: haversine(lat, lon, a.lat, a.lon) }))
    .filter(a => a.distKm <= radiusKm)
    .sort((a, b) => a.distKm - b.distKm)
}

// ─── DB insert ────────────────────────────────────────────────────────────────

async function insertAttraction(client, hotelId, rec) {
  await client.query(`
    INSERT INTO nearby_attractions (
      hotel_id, attraction_name, description, category, distance,
      estimated_duration, price_range, transportation, latitude, longitude
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (hotel_id, attraction_name) DO UPDATE SET
      description        = EXCLUDED.description,
      category           = EXCLUDED.category,
      distance           = EXCLUDED.distance,
      estimated_duration = EXCLUDED.estimated_duration,
      price_range        = EXCLUDED.price_range,
      transportation     = EXCLUDED.transportation,
      latitude           = COALESCE(EXCLUDED.latitude, nearby_attractions.latitude),
      longitude          = COALESCE(EXCLUDED.longitude, nearby_attractions.longitude),
      updated_at         = NOW()
  `, [
    hotelId,
    rec.attraction_name,
    rec.description,
    rec.category,
    rec.distance,
    rec.estimated_duration,
    rec.price_range,
    rec.transportation,
    rec.latitude  ?? null,
    rec.longitude ?? null,
  ])
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect()
  try {
    // Load hotel GPS coords
    const { rows } = await client.query(
      'SELECT hotel_id, name, latitude, longitude FROM hotels WHERE hotel_id = $1', [HOTEL_ID]
    )
    if (rows.length === 0) {
      console.error(`\n❌ Hotel "${HOTEL_ID}" not found.`)
      const all = await client.query('SELECT hotel_id, name FROM hotels')
      console.log('Available hotels:')
      all.rows.forEach(h => console.log(`  - ${h.hotel_id}  "${h.name}"`))
      process.exit(1)
    }

    const hotel = rows[0]
    console.log(`\n🏨  ${hotel.name}  (${hotel.hotel_id})`)
    console.log(`📍  ${hotel.latitude}, ${hotel.longitude}  |  radius ${RADIUS_KM} km`)

    if (!hotel.latitude || !hotel.longitude) {
      console.error('❌ Hotel has no GPS coordinates in the database.')
      process.exit(1)
    }

    console.log(`\n🔑 API keys:  OTM=${OTM_KEY ? '✅' : '❌ not set'}   FSQ=${FSQ_KEY ? '✅' : '❌ not set'}`)

    let items = []

    // ── Step 1: Foursquare (restaurant / cafe / entertainment / shopping) ──────
    if (FSQ_KEY) {
      try {
        const fsqItems = await fetchFromFoursquare(hotel.latitude, hotel.longitude, RADIUS_KM)
        items.push(...fsqItems)
      } catch (err) {
        console.error(`\n⚠️  Foursquare failed: ${err.message}`)
        console.error('   restaurant/café/entertainment/shopping will use static dataset as fallback.')
      }
    } else {
      console.log('\n⚠️  No Foursquare key — restaurant/café/entertainment/shopping from static dataset.')
    }

    // ── Step 2: OpenTripMap (cultural / nature / adventure) ───────────────────
    if (OTM_KEY) {
      try {
        const otmItems = await fetchFromOpenTripMap(hotel.latitude, hotel.longitude, RADIUS_KM)
        items.push(...otmItems)
      } catch (err) {
        console.error(`\n⚠️  OpenTripMap failed: ${err.message}`)
        console.error('   cultural/nature/adventure will use static dataset as fallback.')
      }
    } else {
      console.log('\n⚠️  No OpenTripMap key — cultural/nature/adventure from static dataset.')
    }

    // ── Step 3: Static fallback for any missing category ─────────────────────
    const coveredCategories = new Set(items.map(i => i.category))
    const allCategories = ['cultural', 'nature', 'adventure', 'restaurant', 'cafe', 'entertainment', 'shopping']
    const missingCategories = allCategories.filter(c => !coveredCategories.has(c))

    if (missingCategories.length > 0) {
      console.log(`\n📦 Static fallback for: ${missingCategories.join(', ')}`)
      const staticItems = getStaticAttractions(hotel.latitude, hotel.longitude, RADIUS_KM)
        .filter(a => missingCategories.includes(a.category))
      console.log(`   ${staticItems.length} places found within ${RADIUS_KM} km`)
      items.push(...staticItems.map(a => ({
        name: a.name,
        description: a.description,
        category: a.category,
        lat: a.lat,
        lon: a.lon,
        extra: { price_range: a.price_range },
      })))
    }

    if (items.length === 0) {
      console.warn('\n⚠️  No attractions found. Try a larger radius.')
      process.exit(0)
    }

    // ── Step 4: Deduplicate + insert ──────────────────────────────────────────
    console.log(`\n💾 Inserting ${items.length} places into nearby_attractions...\n`)
    let inserted = 0, skipped = 0
    const seen = new Set()

    for (const item of items) {
      const nameKey = item.name.toLowerCase().trim()
      if (seen.has(nameKey)) { skipped++; continue }
      seen.add(nameKey)

      const distKm = haversine(hotel.latitude, hotel.longitude, item.lat, item.lon)
      const defaults = getDefaults(item.category, distKm)
      const priceRange = item.extra?.price_range || defaults.price_range

      const rec = {
        attraction_name:    item.name.substring(0, 100),
        description:        (item.description || item.name).substring(0, 1000),
        category:           item.category,
        distance:           distText(distKm),
        estimated_duration: defaults.estimated_duration,
        price_range:        priceRange,
        transportation:     defaults.transportation,
        latitude:           item.lat  ?? null,
        longitude:          item.lon  ?? null,
      }

      try {
        await insertAttraction(client, HOTEL_ID, rec)
        const src = item.lat ? '📍' : '  '
        console.log(`  ✅ ${src} [${rec.category.padEnd(13)}] ${rec.attraction_name}  (${rec.distance})`)
        inserted++
      } catch (err) {
        console.warn(`  ⚠️  Skipped "${item.name}": ${err.message}`)
        skipped++
      }
    }

    console.log(`\n🎉 Done!  ${inserted} inserted/updated,  ${skipped} skipped (duplicates).`)
    console.log(`\nVerify in DB:`)
    console.log(`  SELECT category, COUNT(*), COUNT(latitude) as with_coords`)
    console.log(`  FROM nearby_attractions WHERE hotel_id = '${HOTEL_ID}'`)
    console.log(`  GROUP BY category ORDER BY category;`)

  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
