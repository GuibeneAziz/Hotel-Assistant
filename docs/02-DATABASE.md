# Database — Tunisia Hotel Assistant

## 1. Database System

- **Engine**: PostgreSQL (hosted on NeonDB — serverless PostgreSQL)
- **Client**: `pg` (node-postgres) with a connection pool of 20 connections
- **Connection**: SSL (`rejectUnauthorized: false` for NeonDB compatibility)
- **Schema file**: `scripts/redesign-database.sql`

---

## 2. Entity-Relationship Summary

```
hotels (1)
   ├──< facilities (N)          — pool, gym, spa, kids club, restaurant meals
   ├──< contact_info (1)        — phone, email, address
   ├──< amenities (N)           — wifi, parking, check-in, check-out
   ├──< special_events (N)      — hotel events with date/time/photo
   ├──< hotel_activities (N)    — activities inside the hotel
   ├──< nearby_attractions (N)  — places outside the hotel (from API)
   ├──< guest_profiles (N)      — one row per guest session
   └──< reservations (N)        — guest room reservations
```

`guest_profiles (1)` links to → `question_categories (N)` and `popular_topics (N)` via `hotel_id`.

---

## 3. Tables — Detailed Description

### 3.1 `hotels`

The root table. One row per hotel.

| Column | Type | Description |
|---|---|---|
| `hotel_id` | VARCHAR(50) PK | Slug identifier e.g. `sindbad-hammamet` |
| `name` | VARCHAR(100) | Display name e.g. `Sindbad Hammamet` |
| `location` | VARCHAR(100) | Human-readable location |
| `description` | TEXT | Short hotel description |
| `image_url` | VARCHAR(255) | URL to the hotel's hero image |
| `color` | VARCHAR(20) | Theme color for the UI card |
| `latitude` | DECIMAL(10,8) | GPS coordinates |
| `longitude` | DECIMAL(11,8) | GPS coordinates |
| `created_at` | TIMESTAMP | Auto-set |
| `updated_at` | TIMESTAMP | Auto-set |

**Current hotels:**

| hotel_id | name | city |
|---|---|---|
| `sindbad-hammamet` | Sindbad Hammamet | Hammamet |
| `villa-didon-carthage` | Villa Didon | Carthage, Tunis |
| `belvedere-fourati-tunis` | Belvedere El Fourati | Tunis |

---

### 3.2 `facilities`

Stores availability and hours for all physical facilities. One row per facility-type-variant per hotel.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `hotel_id` | VARCHAR(50) FK → hotels | Which hotel |
| `facility_type` | VARCHAR(50) | `restaurant`, `spa`, `pool`, `gym`, `kids_club` |
| `facility_name` | VARCHAR(50) | For restaurant: `breakfast`, `lunch`, `dinner`. Others: NULL |
| `open_time` | TIME | Opening time |
| `close_time` | TIME | Closing time |
| `is_available` | BOOLEAN | Whether currently open/active |
| `treatments` | TEXT[] | For spa only: list of treatment names |
| `age_range` | TEXT | For kids_club only: e.g. `4-12 years` |

**Unique constraint**: `(hotel_id, facility_type, facility_name)` — no duplicate facility entries per hotel.

**Example rows for one hotel:**

```
(villa-didon-carthage, restaurant, breakfast, 07:00, 10:30, true, {}, NULL)
(villa-didon-carthage, restaurant, lunch,     12:30, 15:00, true, {}, NULL)
(villa-didon-carthage, spa,        NULL,       09:00, 19:00, true, {Swedish Massage, Hammam, Hot Stone}, NULL)
(villa-didon-carthage, pool,       NULL,       08:00, 20:00, true, {}, NULL)
(villa-didon-carthage, kids_club,  NULL,       09:00, 17:00, true, {}, 4-12 years)
```

---

### 3.3 `contact_info`

One row per hotel (1:1 relationship).

| Column | Type | Description |
|---|---|---|
| `hotel_id` | VARCHAR(50) PK FK | Primary key = hotel_id (1:1) |
| `phone` | VARCHAR(20) | Main front desk phone |
| `email` | VARCHAR(100) | Hotel email |
| `address` | TEXT | Full postal address |
| `emergency_phone` | VARCHAR(20) | 24h emergency number |

---

### 3.4 `amenities`

Stores WiFi, parking, check-in/out rules.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `hotel_id` | VARCHAR(50) FK | Which hotel |
| `amenity_type` | VARCHAR(50) | `wifi`, `parking`, `checkin`, `checkout` |
| `is_available` | BOOLEAN | Whether available |
| `primary_value` | VARCHAR(100) | WiFi password, parking price, or check-in time |
| `instructions` | TEXT | Additional instructions |

**Unique constraint**: `(hotel_id, amenity_type)` — one row per amenity per hotel.

---

### 3.5 `special_events`

Hotel-organized events (galas, concerts, theme nights, etc.).

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `hotel_id` | VARCHAR(50) FK | Which hotel |
| `title` | VARCHAR(200) | Event title |
| `description` | TEXT | Full description |
| `event_date` | DATE | Date of the event |
| `event_time` | TIME | Start time |
| `location` | VARCHAR(100) | Location within hotel |
| `price` | VARCHAR(50) | Price or "Free" |
| `image_url` | VARCHAR(500) | Optional event photo (uploaded to `/public/uploads/events/`) |
| `requires_reservation` | BOOLEAN | Whether booking is needed |

**Indexes**: on `hotel_id` and `event_date` for fast date-range queries.

---

### 3.6 `hotel_activities`

Activities that happen inside the hotel (yoga, cooking classes, etc.).

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `hotel_id` | VARCHAR(50) FK | Which hotel |
| `activity_name` | VARCHAR(100) | Name of the activity |
| `category` | VARCHAR(50) | `family`, `couples`, `sports`, `cultural`, etc. |
| `description` | TEXT | What the activity involves |
| `location` | VARCHAR(100) | Where in the hotel |
| `is_available` | BOOLEAN | Currently offered or not |

---

### 3.7 `nearby_attractions`

Places outside the hotel that guests can visit. This is the core dataset for the recommendation engine.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `hotel_id` | VARCHAR(50) FK | Which hotel this attraction belongs to |
| `attraction_name` | VARCHAR(100) | Name of the place |
| `category` | VARCHAR(50) | `adventure`, `cafe`, `cultural`, `entertainment`, `nature`, `restaurant`, `shopping` |
| `description` | TEXT | Description (up to 1000 chars) |
| `distance` | VARCHAR(50) | Text e.g. `3.5 km`, `500 m` |
| `estimated_duration` | VARCHAR(50) | e.g. `1-2 hours` |
| `price_range` | VARCHAR(50) | e.g. `Free`, `10-40 TND` |
| `transportation` | VARCHAR(100) | How to get there |
| `image_url` | TEXT | Optional photo URL (Wikimedia Commons or admin-set) |
| `latitude` | DOUBLE PRECISION | GPS coordinates (added for map feature) |
| `longitude` | DOUBLE PRECISION | GPS coordinates (added for map feature) |
| `priority_order` | INTEGER | Manual ordering weight |
| `created_at` | TIMESTAMP | Auto-set |
| `updated_at` | TIMESTAMP | Auto-set |

**Unique constraint**: `(hotel_id, attraction_name)` — no duplicate attraction per hotel.

**Categories used in the system:**

| Category | Example places |
|---|---|
| `cultural` | Carthage ruins, Medina, Bardo Museum |
| `nature` | Beach, coastal walk, lagoon, parks |
| `adventure` | Jet ski, quad biking, desert tours |
| `entertainment` | Theme parks, marina, cinemas |
| `cafe` | Work-friendly cafes, traditional coffee houses |
| `restaurant` | Local dining, seafood, fine dining |
| `shopping` | Markets, souks, malls |

**Target**: 6 attractions per category per hotel = ~42 attractions per hotel.

---

### 3.8 `guest_profiles`

One row per guest session. Created when the guest fills in the registration form.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `session_id` | VARCHAR(100) UNIQUE | Unique session identifier (generated client-side) |
| `hotel_id` | VARCHAR(50) FK | Which hotel the guest is at |
| `age_range` | VARCHAR(10) | `18-25`, `26-35`, `36-50`, `50+` |
| `nationality` | VARCHAR(50) | Country of origin |
| `travel_purpose` | VARCHAR(20) | `leisure`, `business`, `family`, `honeymoon` |
| `group_type` | VARCHAR(20) | `solo`, `couple`, `family`, `group` |
| `preferred_language` | VARCHAR(5) | Detected/selected language |
| `first_visit` | TIMESTAMP | When they first chatted |
| `last_visit` | TIMESTAMP | Last message timestamp |
| `total_interactions` | INTEGER | Count of messages sent |

---

### 3.9 `question_categories`

Aggregated daily counts of what topics guests ask about.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `hotel_id` | VARCHAR(50) FK | Which hotel |
| `category` | VARCHAR(50) | `facilities`, `dining`, `activities`, `weather`, etc. |
| `subcategory` | VARCHAR(100) | `pool_hours`, `breakfast_time`, `nearby_attractions`, etc. |
| `question_count` | INTEGER | Total questions in this category today |
| `date` | DATE | The day this row covers |
| `last_asked` | TIMESTAMP | Most recent question time |
| `age_18_25` | INTEGER | Questions from this age group |
| `age_26_35` | INTEGER | Questions from this age group |
| `age_36_50` | INTEGER | Questions from this age group |
| `age_50_plus` | INTEGER | Questions from this age group |

**Unique constraint**: `(hotel_id, category, subcategory, date)` — one row per category per day per hotel.

---

### 3.10 `popular_topics`

Tracks which specific topics (pool, breakfast, spa, etc.) are mentioned most.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `hotel_id` | VARCHAR(50) FK | Which hotel |
| `topic` | VARCHAR(100) | e.g. `pool`, `wifi`, `breakfast`, `beach` |
| `mention_count` | INTEGER | How many times mentioned today |
| `date` | DATE | The day |
| `positive_sentiment` | INTEGER | Positive mentions count |
| `negative_sentiment` | INTEGER | Negative mentions count |

**Unique constraint**: `(hotel_id, topic, date)` — one row per topic per day per hotel.

---

### 3.11 `reservations`

Guest room reservations (for admin management).

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `hotel_id` | VARCHAR(50) FK | Which hotel |
| `guest_name` | VARCHAR(100) | Guest full name |
| `room_number` | VARCHAR(20) | Room identifier |
| `check_in` | DATE | Check-in date |
| `check_out` | DATE | Check-out date |
| `status` | VARCHAR(20) | `confirmed`, `pending`, `cancelled` |
| `created_at` | TIMESTAMP | When reservation was created |

---

## 4. Design Decisions

### Why NOT use an ORM (Prisma)?

The project started with Prisma but migrated to raw `pg` queries because:
- NeonDB serverless connections have cold-start latency; direct pool configuration was needed
- Complex parallel query patterns (`Promise.all` with 6 queries) are cleaner in raw SQL
- Full control over `ON CONFLICT DO UPDATE` upserts needed for seeding scripts

The `prisma/migrations/` folder still exists as historical record.

### Why TEXT[] for spa treatments?

The `treatments` column on `facilities` stores a PostgreSQL array directly (e.g. `{Swedish Massage, Hammam}`). This avoids a separate `facility_attributes` table that was previously used and removed because it added a join for no benefit — treatments are always accessed together with the facility row.

### Why VARCHAR(50) for hotel_id?

Using a human-readable slug (`sindbad-hammamet`) instead of a numeric auto-increment ID makes URLs meaningful (`/hotel/sindbad-hammamet`) and makes debugging easier — you can read a SQL query result and immediately know which hotel you're looking at.

### Caching strategy

Two caching layers exist:

1. **In-process cache** (`lib/db.ts`): The assembled hotel settings object (result of all 6 queries merged) is kept in memory for 5 minutes. This is the most important cache — it means chat messages never hit the database unless settings were recently changed. Invalidated immediately when admin saves new settings.

2. **Redis cache** (`lib/ai-service.ts`): The AI's text response is cached in Redis for 1 hour, keyed by MD5 of (message + context). Repeated identical questions (e.g. many guests asking "what time is checkout?") return instantly from cache.
