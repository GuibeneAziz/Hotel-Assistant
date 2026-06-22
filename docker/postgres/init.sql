-- Hotel Assistant — PostgreSQL schema (Docker init)
-- Runs once when the postgres volume is first created.

-- ─── Core hotel tables ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hotels (
    hotel_id VARCHAR(50) PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS facilities (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    facility_type VARCHAR(50) NOT NULL,
    facility_name VARCHAR(50),
    open_time TIME,
    close_time TIME,
    is_available BOOLEAN DEFAULT true,
    treatments TEXT[] DEFAULT ARRAY[]::TEXT[],
    age_range TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (hotel_id, facility_type, facility_name)
);

CREATE TABLE IF NOT EXISTS contact_info (
    hotel_id VARCHAR(50) PRIMARY KEY REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    emergency_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS amenities (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    amenity_type VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    primary_value VARCHAR(100),
    instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (hotel_id, amenity_type)
);

CREATE TABLE IF NOT EXISTS special_events (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(100),
    price VARCHAR(50),
    image_url VARCHAR(500),
    requires_reservation BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_activities (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    activity_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    location VARCHAR(100),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nearby_attractions (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    attraction_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    distance VARCHAR(50),
    estimated_duration VARCHAR(50),
    price_range VARCHAR(50),
    transportation VARCHAR(100),
    image_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    priority_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (hotel_id, attraction_name)
);

-- ─── Analytics tables ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guest_profiles (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    age_range VARCHAR(10),
    nationality VARCHAR(50),
    travel_purpose VARCHAR(20),
    group_type VARCHAR(20),
    preferred_language VARCHAR(5) DEFAULT 'en',
    first_visit TIMESTAMP DEFAULT NOW(),
    last_visit TIMESTAMP DEFAULT NOW(),
    total_interactions INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS question_categories (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100) NOT NULL,
    question_count INTEGER DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_asked TIMESTAMP DEFAULT NOW(),
    age_18_25 INTEGER DEFAULT 0,
    age_26_35 INTEGER DEFAULT 0,
    age_36_50 INTEGER DEFAULT 0,
    age_50_plus INTEGER DEFAULT 0,
    UNIQUE (hotel_id, category, subcategory, date)
);

CREATE TABLE IF NOT EXISTS popular_topics (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    mention_count INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    positive_sentiment INTEGER NOT NULL DEFAULT 0,
    negative_sentiment INTEGER NOT NULL DEFAULT 0,
    UNIQUE (hotel_id, topic, date)
);

-- ─── Reservations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_reservations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
    hotel_id VARCHAR(50) NOT NULL,
    guest_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    room_number TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_facilities_hotel ON facilities(hotel_id);
CREATE INDEX IF NOT EXISTS idx_amenities_hotel ON amenities(hotel_id);
CREATE INDEX IF NOT EXISTS idx_events_hotel ON special_events(hotel_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON special_events(event_date);
CREATE INDEX IF NOT EXISTS idx_hotel_activities_hotel ON hotel_activities(hotel_id);
CREATE INDEX IF NOT EXISTS idx_attractions_hotel ON nearby_attractions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_hotel ON guest_profiles(hotel_id);
CREATE INDEX IF NOT EXISTS idx_event_reservations_event ON event_reservations(event_id);

-- ─── Seed hotels ─────────────────────────────────────────────────────────────

INSERT INTO hotels (hotel_id, name, location, latitude, longitude) VALUES
  ('sindbad-hammamet', 'Sindbad Hotel', 'Hammamet, Tunisia', 36.400000, 10.616667),
  ('villa-didon-carthage', 'Villa Didon', 'Carthage, Tunisia', 36.852800, 10.323300),
  ('belvedere-fourati-tunis', 'Hôtel Belvédère Fourati', 'Tunis, Tunisia', 36.806500, 10.181500)
ON CONFLICT (hotel_id) DO NOTHING;
