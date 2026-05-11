import { NextRequest, NextResponse } from 'next/server'
import { getReservationsByHotel, updateReservationStatus } from '@/lib/db'
import { verify } from 'jsonwebtoken'
import { getEnv } from '@/lib/env'

function verifyAdminToken(request: NextRequest): boolean {
  try {
    const env = getEnv()
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return false
    const token = authHeader.substring(7)
    verify(token, env.JWT_SECRET, {
      issuer: 'tunisia-hotel-assistant',
      audience: 'tunisia-hotel-api',
    })
    return true
  } catch {
    return false
  }
}

// GET /api/admin/reservations?hotelId=xxx
export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const hotelId = request.nextUrl.searchParams.get('hotelId')
  if (!hotelId) {
    return NextResponse.json({ success: false, error: 'Missing hotelId' }, { status: 400 })
  }

  try {
    const reservations = await getReservationsByHotel(hotelId)
    return NextResponse.json({ success: true, data: reservations })
  } catch (error: any) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reservations', message: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/reservations — { id, status }
export async function PATCH(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !['pending', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id or status' },
        { status: 400 }
      )
    }

    const updated = await updateReservationStatus(Number(id), status)
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating reservation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update reservation', message: error.message },
      { status: 500 }
    )
  }
}
