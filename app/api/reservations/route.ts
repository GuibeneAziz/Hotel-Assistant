import { NextRequest, NextResponse } from 'next/server'
import { createReservation } from '@/lib/db'
import pool from '@/lib/db'
import { getTodayLocal, normalizeEventDate } from '@/lib/event-dates'

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

    const numericEventId = Number(eventId)
    if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid event. Please refresh the page and try again.' },
        { status: 400 }
      )
    }

    // Verify event exists and actually requires reservation
    const eventCheck = await pool.query(
      `SELECT id, requires_reservation, event_date
       FROM special_events WHERE id = $1 AND hotel_id = $2`,
      [numericEventId, hotelId]
    )

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'This event is no longer available. Please refresh the page.' },
        { status: 404 }
      )
    }

    const eventDate = normalizeEventDate(eventCheck.rows[0].event_date)
    const today = getTodayLocal()
    if (!eventDate || eventDate < today) {
      return NextResponse.json(
        { success: false, error: 'This event has already passed and cannot be reserved.' },
        { status: 400 }
      )
    }

    if (!eventCheck.rows[0].requires_reservation) {
      return NextResponse.json(
        { success: false, error: 'This event does not require reservations' },
        { status: 400 }
      )
    }

    const reservation = await createReservation({
      eventId: numericEventId,
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
