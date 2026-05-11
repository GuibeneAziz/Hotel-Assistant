import { NextRequest, NextResponse } from 'next/server'
import { createReservation } from '@/lib/db'
import pool from '@/lib/db'

// POST /api/reservations — public endpoint, no auth required
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, hotelId, guestName, phoneNumber, roomNumber, email, notes } = body

    // Basic validation
    if (!eventId || !hotelId || !guestName?.trim() || !phoneNumber?.trim() || !roomNumber?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify event exists and actually requires reservation
    const eventCheck = await pool.query(
      'SELECT id, requires_reservation FROM special_events WHERE id = $1 AND hotel_id = $2',
      [eventId, hotelId]
    )

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!eventCheck.rows[0].requires_reservation) {
      return NextResponse.json(
        { success: false, error: 'This event does not require reservations' },
        { status: 400 }
      )
    }

    const reservation = await createReservation({
      eventId: Number(eventId),
      hotelId,
      guestName: guestName.trim(),
      phoneNumber: phoneNumber.trim(),
      roomNumber: roomNumber.trim(),
      email: email?.trim() || undefined,
      notes: notes?.trim() || undefined,
    })

    return NextResponse.json({ success: true, data: reservation }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create reservation', message: error.message },
      { status: 500 }
    )
  }
}
