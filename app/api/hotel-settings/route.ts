import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache, deleteCachePattern } from '@/lib/redis'
import type { ApiResponse } from '@/types/api'
import { getAllHotelSettings, invalidateHotelSettingsCache } from '@/lib/db'
import pool from '@/lib/db'
import { verify } from 'jsonwebtoken'
import { getEnv } from '@/lib/env'
import { normalizeEventDate } from '@/lib/event-dates'

const CACHE_KEY = 'hotel:settings:all'
const CACHE_TTL = 3600 // 1 hour

// Verify JWT from Authorization header
function verifyAdminToken(request: NextRequest): boolean {
  try {
    const env = getEnv()
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return false
    const token = authHeader.substring(7)
    verify(token, env.JWT_SECRET, {
      issuer: 'tunisia-hotel-assistant',
      audience: 'tunisia-hotel-api'
    })
    return true
  } catch {
    return false
  }
}

// GET - Load hotel settings from PostgreSQL
export async function GET() {
  try {
    const skipCache = process.env.NODE_ENV === 'development'

    if (!skipCache) {
      const cached = await getCached(CACHE_KEY)
      if (cached) {
        return NextResponse.json<ApiResponse>({ success: true, data: cached })
      }
    }

    const settings = await getAllHotelSettings()
    await setCache(CACHE_KEY, settings, CACHE_TTL)

    return NextResponse.json<ApiResponse>({ success: true, data: settings })
  } catch (error: any) {
    console.error('Error loading hotel settings:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to load settings', message: error.message },
      { status: 500 }
    )
  }
}

// POST - Save hotel settings to database (JWT protected)
export async function POST(request: NextRequest) {
  // Require valid admin JWT
  if (!verifyAdminToken(request)) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { hotelId, settings } = body

    if (!hotelId || !settings) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing required fields', message: 'hotelId and settings are required' },
        { status: 400 }
      )
    }

    // Coerce empty strings to null so PostgreSQL `time` columns never receive ''
    const t = (v: string | undefined | null) => (v && v.trim() !== '' ? v : null)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Update restaurant facilities
      if (settings.restaurant) {
        for (const [mealType, mealData] of Object.entries(settings.restaurant)) {
          const meal = mealData as { available: boolean; start: string; end: string }
          // Skip if times are empty (no row in DB for this meal)
          if (!t(meal.start) && !t(meal.end)) continue
          await client.query(`
            UPDATE facilities
            SET is_available = $1, open_time = $2, close_time = $3
            WHERE hotel_id = $4 AND facility_type = 'restaurant' AND facility_name = $5
          `, [meal.available, t(meal.start), t(meal.end), hotelId, mealType])
        }
      }

      // Update spa
      if (settings.spa && (t(settings.spa.openTime) || t(settings.spa.closeTime))) {
        await client.query(`
          UPDATE facilities SET is_available = $1, open_time = $2, close_time = $3
          WHERE hotel_id = $4 AND facility_type = 'spa'
        `, [settings.spa.available, t(settings.spa.openTime), t(settings.spa.closeTime), hotelId])
      }

      // Update pool
      if (settings.pool && (t(settings.pool.openTime) || t(settings.pool.closeTime))) {
        await client.query(`
          UPDATE facilities SET is_available = $1, open_time = $2, close_time = $3
          WHERE hotel_id = $4 AND facility_type = 'pool'
        `, [settings.pool.available, t(settings.pool.openTime), t(settings.pool.closeTime), hotelId])
      }

      // Update Infinity Bar (pool-side bar) — stored as its own facility row
      if (settings.pool && (t(settings.pool.barOpenTime) || t(settings.pool.barCloseTime))) {
        await client.query(`
          INSERT INTO facilities (hotel_id, facility_type, facility_name, is_available, open_time, close_time)
          VALUES ($1, 'bar', 'infinity_bar', $2, $3, $4)
          ON CONFLICT (hotel_id, facility_type, facility_name)
          DO UPDATE SET
            is_available = EXCLUDED.is_available,
            open_time = EXCLUDED.open_time,
            close_time = EXCLUDED.close_time
        `, [
          hotelId,
          settings.pool.available !== false,
          t(settings.pool.barOpenTime),
          t(settings.pool.barCloseTime),
        ])
      }

      // Update contact information
      if (settings.contact) {
        const c = settings.contact
        await client.query(`
          INSERT INTO contact_info (hotel_id, phone, email, address, emergency_phone, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (hotel_id) DO UPDATE SET
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            emergency_phone = EXCLUDED.emergency_phone,
            updated_at = NOW()
        `, [
          hotelId,
          c.phone || null,
          c.email || null,
          c.address || null,
          c.emergencyPhone || null,
        ])
      }

      // Update amenities (WiFi, parking, check-in/out)
      if (settings.wifi) {
        await client.query(`
          INSERT INTO amenities (hotel_id, amenity_type, is_available, primary_value, instructions)
          VALUES ($1, 'wifi', $2, $3, $4)
          ON CONFLICT (hotel_id, amenity_type) DO UPDATE SET
            is_available = EXCLUDED.is_available,
            primary_value = EXCLUDED.primary_value,
            instructions = EXCLUDED.instructions
        `, [
          hotelId,
          settings.wifi.available,
          settings.wifi.password || null,
          settings.wifi.instructions || null,
        ])
      }

      if (settings.parking) {
        await client.query(`
          INSERT INTO amenities (hotel_id, amenity_type, is_available, primary_value, instructions)
          VALUES ($1, 'parking', $2, $3, $4)
          ON CONFLICT (hotel_id, amenity_type) DO UPDATE SET
            is_available = EXCLUDED.is_available,
            primary_value = EXCLUDED.primary_value,
            instructions = EXCLUDED.instructions
        `, [
          hotelId,
          settings.parking.available,
          settings.parking.price || null,
          settings.parking.instructions || null,
        ])
      }

      if (settings.checkIn) {
        await client.query(`
          INSERT INTO amenities (hotel_id, amenity_type, is_available, primary_value, instructions)
          VALUES ($1, 'checkin', $2, $3, $4)
          ON CONFLICT (hotel_id, amenity_type) DO UPDATE SET
            is_available = EXCLUDED.is_available,
            primary_value = EXCLUDED.primary_value,
            instructions = EXCLUDED.instructions
        `, [
          hotelId,
          true,
          t(settings.checkIn.time),
          settings.checkIn.instructions || null,
        ])
      }

      if (settings.checkOut) {
        await client.query(`
          INSERT INTO amenities (hotel_id, amenity_type, is_available, primary_value, instructions)
          VALUES ($1, 'checkout', $2, $3, $4)
          ON CONFLICT (hotel_id, amenity_type) DO UPDATE SET
            is_available = EXCLUDED.is_available,
            primary_value = EXCLUDED.primary_value,
            instructions = EXCLUDED.instructions
        `, [
          hotelId,
          true,
          t(settings.checkOut.time),
          settings.checkOut.instructions || null,
        ])
      }

      // Update gym
      if (settings.gym && (t(settings.gym.openTime) || t(settings.gym.closeTime))) {
        await client.query(`
          UPDATE facilities SET is_available = $1, open_time = $2, close_time = $3
          WHERE hotel_id = $4 AND facility_type = 'gym'
        `, [settings.gym.available, t(settings.gym.openTime), t(settings.gym.closeTime), hotelId])
      }

      // Update kids club (only if a row actually exists in DB)
      if (settings.kidsClub && (t(settings.kidsClub.openTime) || t(settings.kidsClub.closeTime))) {
        await client.query(`
          UPDATE facilities SET is_available = $1, open_time = $2, close_time = $3
          WHERE hotel_id = $4 AND facility_type = 'kids_club'
        `, [settings.kidsClub.available, t(settings.kidsClub.openTime), t(settings.kidsClub.closeTime), hotelId])
      }

      // Sync special events: update existing rows by id, insert new ones, remove deleted
      if (settings.specialEvents !== undefined) {
        const keptIds: number[] = []

        for (const event of settings.specialEvents) {
          if (!event.title || !event.date) continue

          const eventDate = normalizeEventDate(event.date) || event.date
          const numericId = /^\d+$/.test(String(event.id)) ? Number(event.id) : null
          const params = [
            event.title,
            event.description || null,
            eventDate,
            t(event.time) ?? '00:00',
            event.location || null,
            event.price || null,
            event.imageUrl || null,
            event.requiresReservation ?? false,
          ]

          if (numericId) {
            const updated = await client.query(`
              UPDATE special_events
              SET title = $1, description = $2, event_date = $3, event_time = $4,
                  location = $5, price = $6, image_url = $7, requires_reservation = $8
              WHERE id = $9 AND hotel_id = $10
              RETURNING id
            `, [...params, numericId, hotelId])

            if (updated.rowCount && updated.rowCount > 0) {
              keptIds.push(numericId)
              continue
            }
          }

          const inserted = await client.query(`
            INSERT INTO special_events (hotel_id, title, description, event_date, event_time, location, price, image_url, requires_reservation)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
          `, [hotelId, ...params])

          keptIds.push(inserted.rows[0].id)
        }

        if (keptIds.length > 0) {
          await client.query(
            `DELETE FROM special_events WHERE hotel_id = $1 AND NOT (id = ANY($2::int[]))`,
            [hotelId, keptIds]
          )
        } else {
          await client.query('DELETE FROM special_events WHERE hotel_id = $1', [hotelId])
        }
      }

      await client.query('COMMIT')

      // Clear Redis cache and in-process cache so next GET returns fresh data
      await deleteCachePattern('hotel:*')
      invalidateHotelSettingsCache()

      return NextResponse.json<ApiResponse>({ success: true, message: 'Hotel settings updated successfully' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Error updating hotel settings:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update settings', message: error.message },
      { status: 500 }
    )
  }
}
