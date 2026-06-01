import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache, deleteCachePattern } from '@/lib/redis'
import type { ApiResponse } from '@/types/api'
import { getAllHotelSettings, invalidateHotelSettingsCache } from '@/lib/db'
import pool from '@/lib/db'
import { verify } from 'jsonwebtoken'
import { getEnv } from '@/lib/env'

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

      // Sync special events: delete all then re-insert
      if (settings.specialEvents !== undefined) {
        await client.query('DELETE FROM special_events WHERE hotel_id = $1', [hotelId])
        for (const event of settings.specialEvents) {
          if (!event.title || !event.date) continue
          await client.query(`
            INSERT INTO special_events (hotel_id, title, description, event_date, event_time, location, price, image_url, requires_reservation)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            hotelId,
            event.title,
            event.description || null,
            event.date,
            t(event.time) ?? '00:00',
            event.location || null,
            event.price || null,
            event.imageUrl || null,
            event.requiresReservation ?? false
          ])
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
