-- ============================================
-- CLEAN DATABASE REDESIGN
-- Normalized, scalable, and well-structured
-- ============================================

-- Drop old tables
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS special_events CASCADE;
DROP TABLE IF EXISTS hotel_settings CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;

-- ============================================
-- 1. HOTELS TABLE (Core hotel information)
-- ============================================
CREATE TABLE hotels (
    hotel_id VARCHAR(50) PRIMARY KEY,  -- "sindbad-hammamet"
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    color VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. FACILITIES TABLE (Restaurant, Spa, Pool, Gym, Kids Club)
-- ============================================
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    facility_type VARCHAR(50) NOT NULL,  -- "restaurant", "spa", "pool", "gym", "kids_club"
    facility_name VARCHAR(50),            -- "breakfast", "lunch", "dinner" (for restaurant)
    open_time TIME,
    close_time TIME,
    is_available BOOLEAN DEFAULT true,
    treatments TEXT[] DEFAULT ARRAY[]::TEXT[],  -- spa treatment list
    age_range TEXT,                              -- kids_club age range (e.g. "4-12")
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure unique facility per hotel
    UNIQUE(hotel_id, facility_type, facility_name)
);

CREATE INDEX idx_facilities_hotel ON facilities(hotel_id);
CREATE INDEX idx_facilities_type ON facilities(facility_type);

-- ============================================
-- 4. CONTACT_INFO TABLE (Hotel contact details)
-- ============================================
CREATE TABLE contact_info (
    hotel_id VARCHAR(50) PRIMARY KEY REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    emergency_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. AMENITIES TABLE (WiFi, Parking, Check-in/out)
-- ============================================
CREATE TABLE amenities (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    amenity_type VARCHAR(50) NOT NULL,   -- "wifi", "parking", "checkin", "checkout"
    is_available BOOLEAN DEFAULT true,
    primary_value VARCHAR(100),           -- WiFi password, parking price, check-in time
    instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(hotel_id, amenity_type)
);

CREATE INDEX idx_amenities_hotel ON amenities(hotel_id);

-- ============================================
-- 6. SPECIAL_EVENTS TABLE (Hotel events)
-- ============================================
CREATE TABLE special_events (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(100),
    price VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_hotel ON special_events(hotel_id);
CREATE INDEX idx_events_date ON special_events(event_date);

-- ============================================
-- 7. ACTIVITIES TABLE (Hotel activities by category)
-- ============================================
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,       -- "family", "couples", "adventure", "cultural"
    activity_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_hotel ON activities(hotel_id);
CREATE INDEX idx_activities_category ON activities(category);

-- ============================================
-- COMMENTS FOR CLARITY
-- ============================================
COMMENT ON TABLE hotels IS 'Core hotel information';
COMMENT ON TABLE facilities IS 'Hotel facilities (restaurant meals, spa, pool, gym, kids club)';
COMMENT ON TABLE contact_info IS 'Hotel contact information';
COMMENT ON TABLE amenities IS 'Hotel amenities (WiFi, parking, check-in/out)';
COMMENT ON TABLE special_events IS 'Special events organized by hotels';
COMMENT ON TABLE activities IS 'Activities available at hotels';
