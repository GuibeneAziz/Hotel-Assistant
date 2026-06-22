// PostgreSQL Database Helper using pg library
import { Pool } from 'pg'
import { resolveDatabaseUrl, shouldUseDatabaseSsl } from './database-config'

let pool: Pool | undefined

/** Lazy pool — Next.js must load .env.local before the first connection. */
export function getPool(): Pool {
  if (pool) return pool

  const databaseUrl = resolveDatabaseUrl()
  if (process.env.NODE_ENV === 'development') {
    try {
      const target = new URL(databaseUrl.replace(/^postgresql:/, 'http:'))
      console.log(
        `🔌 PostgreSQL → ${target.username}@${target.hostname}:${target.port || '5432'}${target.pathname}`
      )
    } catch {
      /* ignore */
    }
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ...(shouldUseDatabaseSsl(databaseUrl) ? { ssl: { rejectUnauthorized: false } } : {}),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })

  return pool
}

// Proxy keeps `import pool from '@/lib/db'` working while deferring env reads.
const poolProxy = new Proxy({} as Pool, {
  get(_target, prop) {
    const value = (getPool() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as Function).bind(getPool()) : value
  },
})

export default poolProxy

// In-process cache for hotel settings — avoids hitting the DB on every chat request.
// TTL: 5 minutes. Invalidated by hotel-settings POST via invalidateHotelSettingsCache().
let _settingsCache: { data: any; expiresAt: number } | null = null
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000

export function invalidateHotelSettingsCache() {
  _settingsCache = null
}

// Helper function to get all hotel settings
// Uses 8 parallel bulk queries instead of 7 sequential queries per hotel,
// reducing DB round-trips from O(N*7) to O(1).
export async function getAllHotelSettings() {
  // Serve from in-process cache when fresh
  if (_settingsCache && Date.now() < _settingsCache.expiresAt) {
    return _settingsCache.data
  }

  const client = await getPool().connect()
  try {
    const hotelsResult = await client.query('SELECT hotel_id, name FROM hotels')
    if (hotelsResult.rows.length === 0) return {}

    const hotelIds: string[] = hotelsResult.rows.map((h: any) => h.hotel_id)

    // Run all 6 sub-queries in parallel across all hotels at once
    const [
      facilitiesResult,
      contactResult,
      amenitiesResult,
      eventsResult,
      activitiesResult,
      attractionsResult,
    ] = await Promise.all([
      client.query(
        `SELECT hotel_id, facility_type, facility_name, open_time, close_time, is_available, treatments, age_range
         FROM facilities WHERE hotel_id = ANY($1)`,
        [hotelIds]
      ),
      client.query(
        `SELECT hotel_id, phone, email, address, emergency_phone
         FROM contact_info WHERE hotel_id = ANY($1)`,
        [hotelIds]
      ),
      client.query(
        `SELECT hotel_id, amenity_type, is_available, primary_value, instructions
         FROM amenities WHERE hotel_id = ANY($1)`,
        [hotelIds]
      ),
      client.query(
        `SELECT hotel_id, id, title, description, event_date, event_time, location, price, image_url, requires_reservation
         FROM special_events WHERE hotel_id = ANY($1)
         ORDER BY event_date, event_time`,
        [hotelIds]
      ),
      client.query(
        `SELECT hotel_id, activity_name, category, description, location, is_available
         FROM hotel_activities WHERE hotel_id = ANY($1) AND is_available = true
         ORDER BY category, activity_name`,
        [hotelIds]
      ),
      client.query(
        `SELECT hotel_id, attraction_name, category, description, distance, estimated_duration, price_range, transportation, image_url, latitude, longitude
         FROM nearby_attractions WHERE hotel_id = ANY($1)
         ORDER BY category, attraction_name`,
        [hotelIds]
      ),
    ])

    // Build the settings map in JS — no more per-hotel round-trips
    const settings: any = {}

    for (const hotel of hotelsResult.rows) {
      const hotelId = hotel.hotel_id
      settings[hotelId] = {
        name: hotel.name,
        restaurant: {
          breakfast: { start: '', end: '', available: false },
          lunch: { start: '', end: '', available: false },
          dinner: { start: '', end: '', available: false },
        },
        spa: { available: false, openTime: '', closeTime: '', treatments: [] },
        pool: { openTime: '', closeTime: '', available: false },
        gym: { openTime: '', closeTime: '', available: false },
        kidsClub: { openTime: '', closeTime: '', available: false, ageRange: '' },
        specialEvents: [],
        contact: { phone: '', email: '', address: '', emergencyPhone: '' },
        wifi: { available: false, password: '', instructions: '' },
        parking: { available: false, price: '', instructions: '' },
        checkIn: { time: '', instructions: '' },
        checkOut: { time: '', instructions: '' },
        hotelActivities: [],
        nearbyAttractions: [],
      }
    }

    for (const facility of facilitiesResult.rows) {
      const s = settings[facility.hotel_id]
      if (!s) continue
      if (facility.facility_type === 'restaurant') {
        const mealType = facility.facility_name
        if (s.restaurant[mealType]) {
          s.restaurant[mealType] = { start: facility.open_time, end: facility.close_time, available: facility.is_available }
        }
      } else if (facility.facility_type === 'spa') {
        s.spa = { available: facility.is_available, openTime: facility.open_time, closeTime: facility.close_time, treatments: facility.treatments || [] }
      } else if (facility.facility_type === 'pool') {
        s.pool = { openTime: facility.open_time, closeTime: facility.close_time, available: facility.is_available }
      } else if (facility.facility_type === 'bar') {
        if (!s.pool) {
          s.pool = { openTime: '', closeTime: '', available: false }
        }
        s.pool.barOpenTime = facility.open_time
        s.pool.barCloseTime = facility.close_time
      } else if (facility.facility_type === 'gym') {
        s.gym = { openTime: facility.open_time, closeTime: facility.close_time, available: facility.is_available }
      } else if (facility.facility_type === 'kids_club') {
        s.kidsClub = { openTime: facility.open_time, closeTime: facility.close_time, available: facility.is_available, ageRange: facility.age_range || '' }
      }
    }

    for (const contact of contactResult.rows) {
      const s = settings[contact.hotel_id]
      if (!s) continue
      s.contact = { phone: contact.phone, email: contact.email, address: contact.address, emergencyPhone: contact.emergency_phone }
    }

    for (const amenity of amenitiesResult.rows) {
      const s = settings[amenity.hotel_id]
      if (!s) continue
      if (amenity.amenity_type === 'wifi') {
        s.wifi = { available: amenity.is_available, password: amenity.primary_value, instructions: amenity.instructions }
      } else if (amenity.amenity_type === 'parking') {
        s.parking = { available: amenity.is_available, price: amenity.primary_value, instructions: amenity.instructions }
      } else if (amenity.amenity_type === 'checkin') {
        s.checkIn = { time: amenity.primary_value, instructions: amenity.instructions }
      } else if (amenity.amenity_type === 'checkout') {
        s.checkOut = { time: amenity.primary_value, instructions: amenity.instructions }
      }
    }

    for (const event of eventsResult.rows) {
      const s = settings[event.hotel_id]
      if (!s) continue
      s.specialEvents.push({
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        date: event.event_date,
        time: event.event_time,
        location: event.location,
        price: event.price,
        imageUrl: event.image_url,
        requiresReservation: event.requires_reservation ?? false,
      })
    }

    for (const activity of activitiesResult.rows) {
      const s = settings[activity.hotel_id]
      if (s) s.hotelActivities.push(activity)
    }

    for (const attraction of attractionsResult.rows) {
      const s = settings[attraction.hotel_id]
      if (s) s.nearbyAttractions.push(attraction)
    }

    _settingsCache = { data: settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS }
    return settings
  } finally {
    client.release()
  }
}

// ─── Reservation helpers ───────────────────────────────────────────────────

export async function createReservation(data: {
  eventId: number
  hotelId: string
  guestName: string
  phoneNumber: string
  roomNumber: string
  email?: string
  notes?: string
}) {
  const result = await getPool().query(
    `INSERT INTO event_reservations
       (event_id, hotel_id, guest_name, phone_number, room_number, email, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.eventId,
      data.hotelId,
      data.guestName,
      data.phoneNumber,
      data.roomNumber,
      data.email || null,
      data.notes || null,
    ]
  )
  return result.rows[0]
}

export async function getReservationsByHotel(hotelId: string) {
  const result = await getPool().query(
    `SELECT r.id, r.guest_name, r.phone_number, r.room_number, r.email, r.notes,
            r.status, r.created_at,
            e.title AS event_title, e.event_date, e.event_time
     FROM event_reservations r
     JOIN special_events e ON e.id = r.event_id
     WHERE r.hotel_id = $1
     ORDER BY r.created_at DESC`,
    [hotelId]
  )
  return result.rows
}

export async function updateReservationStatus(id: number, status: 'pending' | 'confirmed' | 'cancelled') {
  const result = await getPool().query(
    `UPDATE event_reservations
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id]
  )
  return result.rows[0]
}
