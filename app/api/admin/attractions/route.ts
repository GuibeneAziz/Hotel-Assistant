import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { getEnv } from '@/lib/env'
import pool from '@/lib/db'

function verifyAdminToken(request: NextRequest): boolean {
  try {
    const env = getEnv()
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return false
    const token = authHeader.substring(7)
    verify(token, env.JWT_SECRET, { issuer: 'tunisia-hotel-assistant', audience: 'tunisia-hotel-api' })
    return true
  } catch {
    return false
  }
}

// GET /api/admin/attractions?hotelId=xxx
export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const hotelId = new URL(request.url).searchParams.get('hotelId')
  if (!hotelId) return NextResponse.json({ success: false, error: 'hotelId required' }, { status: 400 })

  try {
    const result = await pool.query(
      `SELECT id, attraction_name, description, category, distance,
              estimated_duration, price_range, transportation, image_url
       FROM nearby_attractions
       WHERE hotel_id = $1
       ORDER BY category, attraction_name`,
      [hotelId]
    )
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// POST /api/admin/attractions  — add a new attraction
export async function POST(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { hotelId, attraction_name, description, category, distance, estimated_duration, price_range, transportation, image_url } = body

    if (!hotelId || !attraction_name || !category) {
      return NextResponse.json({ success: false, error: 'hotelId, attraction_name and category are required' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO nearby_attractions
         (hotel_id, attraction_name, description, category, distance, estimated_duration, price_range, transportation, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (hotel_id, attraction_name) DO UPDATE SET
         description        = EXCLUDED.description,
         category           = EXCLUDED.category,
         distance           = EXCLUDED.distance,
         estimated_duration = EXCLUDED.estimated_duration,
         price_range        = EXCLUDED.price_range,
         transportation     = EXCLUDED.transportation,
         image_url          = EXCLUDED.image_url,
         updated_at         = NOW()
       RETURNING *`,
      [hotelId, attraction_name, description || '', category, distance || '', estimated_duration || '', price_range || '', transportation || '', image_url || null]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// DELETE /api/admin/attractions?id=xxx
export async function DELETE(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

  try {
    await pool.query('DELETE FROM nearby_attractions WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
