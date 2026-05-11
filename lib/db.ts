// PostgreSQL Database Helper using pg library
import { Pool } from 'pg'

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2s to 10s for NeonDB cold-start latency
})

// Export the pool for direct queries
export default pool

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

  const client = await pool.connect()
  try {
    const hotelsResult = await client.query('SELECT hotel_id, name FROM hotels')
    if (hotelsResult.rows.length === 0) return {}

    const hotelIds: string[] = hotelsResult.rows.map((h: any) => h.hotel_id)

    // Run all 7 sub-queries in parallel across all hotels at once
    const [
      facilitiesResult,
      facilityAttrsResult,
      contactResult,
      amenitiesResult,
      eventsResult,
      activitiesResult,
      attractionsResult,
    ] = await Promise.all([
      client.query(
        `SELECT hotel_id, facility_type, facility_name, open_time, close_time, is_available, id
         FROM facilities WHERE hotel_id = ANY($1)`,
        [hotelIds]
      ),
      client.query(
        `SELECT f.hotel_id, f.facility_type, fa.attribute_key, fa.attribute_value
         FROM facilities f
         JOIN facility_attributes fa ON f.id = fa.facility_id
         WHERE f.hotel_id = ANY($1)
         ORDER BY f.facility_type, fa.attribute_key`,
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
        `SELECT hotel_id, attraction_name, category, description, distance, estimated_duration, price_range, transportation
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
        s.spa = { available: facility.is_available, openTime: facility.open_time, closeTime: facility.close_time, treatments: [] }
      } else if (facility.facility_type === 'pool') {
        s.pool = { openTime: facility.open_time, closeTime: facility.close_time, available: facility.is_available }
      } else if (facility.facility_type === 'gym') {
        s.gym = { openTime: facility.open_time, closeTime: facility.close_time, available: facility.is_available }
      } else if (facility.facility_type === 'kids_club') {
        s.kidsClub = { openTime: facility.open_time, closeTime: facility.close_time, available: facility.is_available, ageRange: '' }
      }
    }

    for (const attr of facilityAttrsResult.rows) {
      const s = settings[attr.hotel_id]
      if (!s) continue
      if (attr.facility_type === 'spa' && attr.attribute_key === 'treatment') {
        s.spa.treatments.push(attr.attribute_value)
      } else if (attr.facility_type === 'kids_club' && attr.attribute_key === 'age_range') {
        s.kidsClub.ageRange = attr.attribute_value
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
  const result = await pool.query(
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
  const result = await pool.query(
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
  const result = await pool.query(
    `UPDATE event_reservations
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id]
  )
  return result.rows[0]
}
