# Admin Dashboard — Tunisia Hotel Assistant

## 1. Overview

The admin dashboard is a protected web interface (`/dashboard`) that allows hotel staff to manage all hotel information that the AI assistant uses. Any change made here is immediately reflected in the chatbot — no restart required.

**Access**: Navigate to `/admin/login`, enter admin credentials, then you are redirected to `/dashboard`.

---

## 2. Authentication

### Login (`/admin/login`)

- Enter the admin password
- The server compares it against the bcrypt hash stored in `ADMIN_PASSWORD_HASH`
- On success: a JWT cookie is set (`admin_token`, valid 24 hours)
- Rate limited: 5 attempts per 15 minutes per IP
- Redirect → `/dashboard`

### Session persistence

The cookie is `httpOnly` (JS cannot read it) and `secure` (HTTPS only in production). The dashboard layout checks the token on every page load via `GET /api/admin/verify`.

---

## 3. Hotel Selector

The dashboard supports multiple hotels. A dropdown at the top lets the admin switch between:
- Sindbad Hammamet
- Villa Didon Carthage
- Belvedere El Fourati

All settings below apply to the currently selected hotel.

---

## 4. Settings Sections

### 4.1 Restaurant Schedule

Configure the three meal services:

| Field | Type | Example |
|---|---|---|
| Breakfast available | Toggle | On/Off |
| Breakfast start/end | Time picker | 07:00 – 10:30 |
| Lunch available | Toggle | On/Off |
| Lunch start/end | Time picker | 12:30 – 15:00 |
| Dinner available | Toggle | On/Off |
| Dinner start/end | Time picker | 19:00 – 22:30 |

When a meal is toggled off, the AI responds "Lunch is currently not available" rather than showing times.

### 4.2 Facilities

Configure pool, gym, spa, and kids club:

| Field | Type |
|---|---|
| Available | Toggle |
| Open/close time | Time picker |
| Spa treatments (list) | Text array |
| Kids club age range | Text input |

### 4.3 Contact Information

| Field | Type |
|---|---|
| Phone | Text (validated format) |
| Email | Text (validated email) |
| Address | Textarea |
| Emergency phone | Text |

This is critical — the AI is instructed to always use the exact values from this section when a guest asks "what is the phone number?" The AI is forbidden from using placeholder text.

### 4.4 WiFi & Parking

| Field | Description |
|---|---|
| WiFi available | Toggle |
| WiFi password | Text |
| WiFi instructions | Text |
| Parking available | Toggle |
| Parking price | Text |
| Parking instructions | Text |

### 4.5 Check-in / Check-out

| Field | Example |
|---|---|
| Check-in time | 14:00 |
| Check-in instructions | "Please bring a valid ID" |
| Check-out time | 12:00 |
| Check-out instructions | "Leave keys at reception" |

### 4.6 Special Events

Events are displayed as cards with full CRUD (create, read, update, delete):

**Fields per event:**
| Field | Type | Notes |
|---|---|---|
| Title | Text | Required, max 100 chars |
| Description | Textarea | Max 500 chars |
| Date | Date picker | YYYY-MM-DD |
| Time | Time picker | HH:MM |
| Location | Text | e.g. "Terrace Restaurant" |
| Price | Text | e.g. "45 TND" or "Free" |
| Photo | Image upload | Uploaded to `/public/uploads/events/` |
| Requires reservation | Toggle | |

Events with today's date are shown to the AI as "TODAY'S EVENTS" (displayed first in the knowledge string). Future events are shown as "UPCOMING EVENTS". Past events are filtered out automatically.

**Photo upload**: The image is uploaded via `POST /api/upload/event-image`. The server stores it as `/public/uploads/events/<uuid>.<ext>` and returns the URL path. The URL is stored in `special_events.image_url`.

### 4.7 Hotel Activities

Manage activities available inside the hotel:

| Field | Example |
|---|---|
| Activity name | "Sunrise Yoga" |
| Category | family, couples, sports, cultural... |
| Description | "One-hour guided yoga on the rooftop" |
| Location | "Rooftop Terrace" |
| Available | Toggle |

### 4.8 Nearby Attractions

View and edit the list of nearby attractions from the database:

| Action | Description |
|---|---|
| View all | See all attractions grouped by category |
| Edit description | Update the attraction text |
| Update photo URL | Set or change the `image_url` for a live preview |
| Add new attraction | Fill in name, category, description, distance, etc. |
| Delete | Remove an attraction from the list |

**Photo management**: Each attraction card has an inline photo editor. Paste a Wikimedia Commons or any public image URL, see a live thumbnail, and save. The URL is stored in `nearby_attractions.image_url` and the AI will include the photo in Step 3 responses.

---

## 5. Save Flow

When the admin clicks "Save":

```
1. Client sends POST /api/hotel-settings
   Body: { hotelId, restaurant, spa, pool, gym, kidsClub, contact,
           wifi, parking, checkIn, checkOut, specialEvents, hotelActivities }

2. Server validates with Zod schema (all fields checked)

3. Server runs UPDATE/UPSERT SQL on:
   - facilities (for each meal, facility type)
   - contact_info
   - amenities
   - special_events (delete all + re-insert new list)
   - hotel_activities

4. Server calls invalidateHotelSettingsCache()
   → The 5-minute in-process cache is cleared

5. Next chat message loads fresh data from DB
```

If any validation fails → the admin sees inline error messages. Settings are not saved until all validation passes.

---

## 6. Analytics Dashboard (`/admin/analytics`)

A separate page showing aggregated usage data for the selected hotel.

### Panels

**Overview cards:**
- Total guest interactions (last 30 days)
- Unique guest sessions
- Most asked category
- Top nationality

**Charts (powered by Recharts):**
- Bar chart: Top 10 most asked question categories
- Pie chart: Guest group type distribution (solo/couple/family/group)
- Pie chart: Travel purpose distribution
- Bar chart: Age range distribution
- Line chart: Daily interaction trend

**Tables:**
- Top topics with mention counts
- Demographics breakdown (nationality, age range, travel purpose)

---

## 7. Reservations Management

The admin can view guest reservations at `/dashboard` under the reservations tab:
- See all reservations with check-in/check-out dates and status
- Filter by status (confirmed, pending, cancelled)
- Data served from `GET /api/admin/reservations`
- Guests can also create reservations via `POST /api/reservations` from the chatbot page
