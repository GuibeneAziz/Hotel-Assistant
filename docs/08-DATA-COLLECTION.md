# Data Collection — Nearby Attractions

## 1. Overview

Every hotel needs a list of nearby attractions that the AI can recommend to guests. This data is stored in the `nearby_attractions` table and is collected using two methods, used in priority order:

| Priority | Source | When used |
|---|---|---|
| 1 | **OpenTripMap API** (live) | When an API key is provided |
| 2 | **Built-in curated dataset** (offline) | When no API key, or API fails |

After the initial population, the data is **static in the database** — the script is only run once per hotel. The chatbot retrieves attractions from the DB, not from the API, on every chat request.

---

## 2. Source 1 — OpenTripMap API

**Script**: `scripts/fetch-attractions.js`
**API**: [OpenTripMap](https://dev.opentripmap.org/product) — free tier, 5000 requests/day

### How it works

```
1. Look up the hotel's GPS coordinates from the `hotels` table
2. Call OpenTripMap API:
   GET /0.1/en/places/radius?radius=<km>&lat=<lat>&lon=<lon>&kinds=<categories>&limit=200
3. For each result:
   - Call detail endpoint: GET /0.1/en/places/xid/<xid>
   - Extract Wikipedia description if available
   - Calculate distance from hotel using Haversine formula
4. Insert into nearby_attractions via ON CONFLICT DO UPDATE
```

### Usage

```bash
node scripts/fetch-attractions.js sindbad-hammamet 15 YOUR_OTM_KEY
#                                  ^hotel ID     ^radius km ^API key
```

### OpenTripMap category mapping

OpenTripMap uses its own category names. These are mapped to the 7 categories used in the app:

| OpenTripMap `kinds` | Our `category` |
|---|---|
| museums, historic, archaeology, religion, architecture | cultural |
| natural, beaches, nature_reserves, gardens_and_parks | nature |
| amusements, theatres_and_entertainment | entertainment |
| sport | adventure |
| shops, markets | shopping |
| (cafes mapped separately) | cafe |

---

## 3. Source 2 — Built-in Tunisian Dataset

When OpenTripMap is unavailable (no key, API error, or offline use), the script falls back to a curated hardcoded dataset of 29 Tunisian attractions, covering the main tourist regions:

| Region | Attractions included |
|---|---|
| Hammamet / Cap Bon | Hammamet Medina, Kasbah, Pupput Roman Site, Beach, Carthageland, Marina, Nabeul Market |
| Sousse / Monastir | Sousse Medina (UNESCO), Ribat, Museum, Port El Kantaoui, Friguia Safari Park |
| Tunis / Carthage | Carthage Ruins (UNESCO), Bardo Museum, Tunis Medina (UNESCO), Sidi Bou Said, Gammarth Beach |
| Djerba | El Ghriba Synagogue, Houmt Souk, Djerba Lagoon |
| Sahara | Douz Desert, Matmata Troglodyte Village, Ong Jemel Rock |

Each entry contains:
- Name, GPS coordinates, category
- Detailed description (historical/cultural context, what to expect)
- Price range
- Notes on booking requirements if applicable

The script filters this list by computing the **Haversine distance** from the hotel coordinates and keeping only attractions within the specified radius.

---

## 4. Haversine Distance Calculation

The Haversine formula calculates the great-circle distance between two GPS points on a sphere (the Earth):

```javascript
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371  // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2
          + Math.cos(lat1 * Math.PI/180)
          * Math.cos(lat2 * Math.PI/180)
          * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
```

This distance is stored as the `distance` column (e.g. `"3.5 km"`, `"500 m"`) and is used by:
1. The distance penalty in the recommendation scoring
2. The AI response to guests ("It's about 3.5 km from the hotel")

---

## 5. Default Values by Category

For each attraction, if no specific data is available from the API, defaults are applied based on category:

| Category | Default duration | Default price | Default transport |
|---|---|---|---|
| cultural | 1-3 hours | Free | Depends on distance |
| nature | 2-4 hours | Free | Depends on distance |
| adventure | 2-4 hours | 20-80 TND | Depends on distance |
| entertainment | 2-3 hours | 10-40 TND | Depends on distance |
| shopping | 1-3 hours | Free | Depends on distance |

Transport defaults by distance:
- > 15 km → "Taxi / Hotel shuttle"
- 5–15 km → "Taxi"
- < 5 km → "Walking / Taxi"

---

## 6. Deduplication

The database has a unique constraint: `UNIQUE(hotel_id, attraction_name)`.

The SQL `ON CONFLICT DO UPDATE` ensures that running the script multiple times is safe — it updates existing rows rather than creating duplicates. The script also maintains a `seen` Set in memory to skip duplicate names within a single run.

---

## 7. Attraction Photos

After the initial data import, photos can be added in two ways:

### Manual via admin dashboard

In the Admin Dashboard → Nearby Attractions section, each attraction card has a photo URL input with live preview. Paste any public image URL (Wikimedia Commons works well) and save.

### Via seed script

`scripts/seed-attractions.js` contains hard-coded `image_url` values for key attractions (e.g. verified Wikimedia Commons URLs for Carthage, Sidi Bou Said, etc.).

`scripts/fix-attraction-images.js` can be run to batch-update image URLs using SQL `UPDATE` statements.

### URL requirements

For Next.js `<Image>` to render an external URL, the domain must be listed in `next.config.js`:

```javascript
images: {
  remotePatterns: [
    { hostname: 'upload.wikimedia.org' },
    { hostname: 'images.unsplash.com' },
    // ...
  ]
}
```

---

## 8. Current Data Scale

| Hotel | Categories | Attractions per category | Total |
|---|---|---|---|
| sindbad-hammamet | 7 | ~6 | ~42 |
| villa-didon-carthage | 7 | ~6 | ~42 |
| belvedere-fourati-tunis | 7 | ~6 | ~42 |

**Target**: 6 attractions per category per hotel — chosen as a balance between variety (enough options for personalization) and manageability (not so many that the AI context becomes too long).

---

## 9. Future: Coordinates Column

A migration script `scripts/add-attraction-coords.js` adds `latitude` and `longitude` columns to `nearby_attractions`. These will enable:
- Embedded Google Maps cards in the chatbot responses
- Precise distance calculations using real GPS rather than text parsing
- Visual map features in the admin dashboard
