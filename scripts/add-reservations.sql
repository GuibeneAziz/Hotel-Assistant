-- Migration: Add reservation system
-- Run this script once against your NeonDB database

-- 1. Add requires_reservation column to special_events
ALTER TABLE special_events
  ADD COLUMN IF NOT EXISTS requires_reservation BOOLEAN NOT NULL DEFAULT false;

-- 2. Create event_reservations table
CREATE TABLE IF NOT EXISTS event_reservations (
  id              SERIAL PRIMARY KEY,
  event_id        INTEGER NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
  hotel_id        TEXT    NOT NULL,
  guest_name      TEXT    NOT NULL,
  phone_number    TEXT    NOT NULL,
  room_number     TEXT    NOT NULL,
  email           TEXT,
  notes           TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_reservations_event_id_idx  ON event_reservations(event_id);
CREATE INDEX IF NOT EXISTS event_reservations_hotel_id_idx  ON event_reservations(hotel_id);
CREATE INDEX IF NOT EXISTS event_reservations_status_idx    ON event_reservations(status);
