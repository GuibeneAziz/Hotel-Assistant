-- ============================================================
-- CLEANUP: Remove old rule-based recommendation columns
-- from nearby_attractions after migration to K-Means clustering.
--
-- The clustering system (lib/attraction-clustering.ts) only needs:
--   hotel_id, attraction_name, category, description,
--   distance, estimated_duration, price_range, transportation
--
-- All boolean suitability / weather / scheduling flags are unused
-- by the current recommendation pipeline and can be removed.
-- ============================================================

-- Step 1: Drop indexes that target the old columns
DROP INDEX IF EXISTS idx_nearby_attractions_couples;
DROP INDEX IF EXISTS idx_nearby_attractions_families;
DROP INDEX IF EXISTS idx_nearby_attractions_solo;
DROP INDEX IF EXISTS idx_nearby_attractions_active;
DROP INDEX IF EXISTS idx_nearby_attractions_priority;

-- Step 2: Drop old guest-type suitability columns
ALTER TABLE nearby_attractions
  DROP COLUMN IF EXISTS suitable_for_couples,
  DROP COLUMN IF EXISTS suitable_for_families,
  DROP COLUMN IF EXISTS suitable_for_solo,
  DROP COLUMN IF EXISTS suitable_for_groups,
  DROP COLUMN IF EXISTS suitable_for_business;

-- Step 3: Drop old age-group suitability columns
ALTER TABLE nearby_attractions
  DROP COLUMN IF EXISTS suitable_for_young,
  DROP COLUMN IF EXISTS suitable_for_middle,
  DROP COLUMN IF EXISTS suitable_for_senior;

-- Step 4: Drop old weather flag columns
ALTER TABLE nearby_attractions
  DROP COLUMN IF EXISTS good_for_sunny,
  DROP COLUMN IF EXISTS good_for_rainy,
  DROP COLUMN IF EXISTS good_for_windy,
  DROP COLUMN IF EXISTS good_for_hot,
  DROP COLUMN IF EXISTS good_for_mild,
  DROP COLUMN IF EXISTS good_for_cool;

-- Step 5: Drop old time-of-day and season columns
ALTER TABLE nearby_attractions
  DROP COLUMN IF EXISTS activity_level,
  DROP COLUMN IF EXISTS good_for_morning,
  DROP COLUMN IF EXISTS good_for_afternoon,
  DROP COLUMN IF EXISTS good_for_evening,
  DROP COLUMN IF EXISTS available_spring,
  DROP COLUMN IF EXISTS available_summer,
  DROP COLUMN IF EXISTS available_autumn,
  DROP COLUMN IF EXISTS available_winter;

-- Step 6: Drop old booking / admin columns
ALTER TABLE nearby_attractions
  DROP COLUMN IF EXISTS requires_booking,
  DROP COLUMN IF EXISTS booking_contact,
  DROP COLUMN IF EXISTS special_notes,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS priority_order;

-- ============================================================
-- Final schema of nearby_attractions after cleanup:
--
--   id               SERIAL PRIMARY KEY
--   hotel_id         VARCHAR(50) NOT NULL
--   attraction_name  VARCHAR(100) NOT NULL
--   description      TEXT NOT NULL
--   category         VARCHAR(50) NOT NULL
--   distance         VARCHAR(50)
--   estimated_duration VARCHAR(50)
--   price_range      VARCHAR(50)
--   transportation   VARCHAR(100)
--   created_at       TIMESTAMP DEFAULT NOW()
--   updated_at       TIMESTAMP DEFAULT NOW()
--
--   UNIQUE (hotel_id, attraction_name)
-- ============================================================

-- Verify: show remaining columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'nearby_attractions'
ORDER BY ordinal_position;
