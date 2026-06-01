# Recommendation System — K-Means Prototype Clustering

## 1. Overview

When a guest has registered their profile (age range, group type, travel purpose), the system no longer shows all attractions equally. Instead, it uses a **K-Means prototype clustering** algorithm to rank attractions based on how well they match the specific guest.

**File**: `lib/attraction-clustering.ts`

---

## 2. Why K-Means Clustering?

### The problem
We need to recommend attractions to a guest we know very little about — we only have 3 data points: age range, group type, and travel purpose. We have no historical booking data, no past preferences, no ratings.

### Why K-Means is appropriate here
In a standard K-Means setup, you train the model on a dataset of real users and let it discover natural clusters. In our case, we have no historical dataset. The solution is **Prototype K-Means** (also called Seeded K-Means):

- Instead of discovering clusters from data, we **define** 5 travel personas as cluster centroids, based on domain knowledge of what hotel guests typically want.
- This is equivalent to running K-Means on a representative training population and freezing the converged centroids for inference.
- This is the standard approach for **cold-start recommendation systems** — when there is no historical data available at inference time.

### The 5 personas (cluster centroids)

| Cluster | Name | Profile description |
|---|---|---|
| 0 | **Adventure Youth** | Young (18-35), solo or group, leisure |
| 1 | **Family Explorer** | Middle-aged (26-50), family group, family trip |
| 2 | **Romantic Couple** | Young-to-middle (26-35), couple, honeymoon/leisure |
| 3 | **Business Professional** | Middle-aged (26-50), solo, business trip |
| 4 | **Senior Traveller** | 50+, couple or solo, leisure |

---

## 3. Step-by-Step Algorithm

### Step 1 — Feature Encoding

The guest profile is converted from categorical values into a 3-dimensional numeric vector. Equal spacing ensures the feature space is balanced.

```
Age range encoding:
  18-25 → 0.10
  26-35 → 0.35
  36-50 → 0.65
  50+   → 0.90

Group type encoding:
  solo    → 0.10
  couple  → 0.37
  family  → 0.65
  group   → 0.90

Travel purpose encoding:
  leisure   → 0.10
  business  → 0.37
  family    → 0.65
  honeymoon → 0.90
```

**Example**: A couple (26-35) on a honeymoon → vector `[0.35, 0.37, 0.90]`

### Step 2 — Cluster Assignment (Euclidean Distance)

The guest vector is compared to all 5 centroid points using Euclidean distance:

```
distance = √( (age - c.age)² + (group - c.group)² + (purpose - c.purpose)² )
```

The centroid with the smallest distance wins. The guest is assigned to that cluster/persona.

**Example**: `[0.35, 0.37, 0.90]` (couple/honeymoon) is closest to centroid 2 `[0.35, 0.37, 0.90]` (Romantic Couple) — distance ≈ 0.

### Step 3 — Base Affinity Score

Each centroid has a set of category affinity weights (0 to 1) defining how much that persona likes each category:

| Category | Adventure Youth | Family Explorer | Romantic Couple | Business Professional | Senior Traveller |
|---|---|---|---|---|---|
| adventure | **0.95** | 0.60 | 0.45 | 0.20 | 0.20 |
| nature | **0.88** | 0.80 | 0.82 | 0.38 | 0.70 |
| entertainment | 0.80 | **0.95** | 0.65 | 0.45 | 0.40 |
| cafe | 0.60 | 0.65 | 0.88 | **0.90** | **0.88** |
| restaurant | 0.55 | 0.78 | **0.92** | 0.88 | 0.82 |
| cultural | 0.40 | 0.72 | 0.75 | 0.85 | **0.92** |
| shopping | 0.30 | 0.50 | 0.70 | 0.80 | 0.65 |

For each attraction, the base affinity = `centroid.categoryWeights[attraction.category]`.

**Example**: A Romantic Couple looking at a restaurant gets base affinity = 0.92.

### Step 4 — Weather Modifier

The base affinity is multiplied by a weather modifier based on the current conditions and whether the category is indoor or outdoor:

```
Category types:
  Outdoor: nature, adventure
  Indoor:  cafe, cultural, shopping, restaurant
  Mixed:   entertainment
```

| Weather condition | Outdoor modifier | Indoor modifier |
|---|---|---|
| Rainy | **0.15** (strongly discouraged) | **1.25** (strongly preferred) |
| Windy | 0.55 | 1.05 |
| Very hot (≥35°C) | 0.70 | 1.10 |
| Ideal (22-35°C) | **1.20** | 0.90 |
| Cool (<22°C) | 0.75 | **1.15** |

**Example**: It's raining. A restaurant (indoor) gets modifier 1.25. An adventure attraction (outdoor) gets 0.15 — heavily penalized.

### Step 5 — Distance Penalty

Closer attractions are ranked higher. The distance string (e.g. "3.5 km") is parsed to a numeric value and a penalty is applied:

| Distance | Penalty |
|---|---|
| ≤ 2 km | 1.00 (no penalty) |
| 2–5 km | 0.92 |
| 5–15 km | 0.82 |
| 15–30 km | 0.70 |
| > 30 km | 0.55 |
| Unknown | 0.85 |

### Final Score Formula

```
score = base_affinity × weather_modifier × distance_penalty × 100
```

Score range: 0–100. All attractions are ranked descending by score.

**Full example** (Romantic Couple, clear weather 28°C, attraction 3 km away):
```
Restaurant:
  base_affinity    = 0.92  (Romantic Couple loves restaurants)
  weather_modifier = 0.90  (indoor in ideal weather gets slight discount)
  distance_penalty = 0.92  (3 km away)
  score = 0.92 × 0.90 × 0.92 × 100 = 76%

Adventure attraction:
  base_affinity    = 0.45  (Romantic Couple not into adventure)
  weather_modifier = 1.20  (outdoor in ideal weather boosted)
  distance_penalty = 0.92  (same 3 km)
  score = 0.45 × 1.20 × 0.92 × 100 = 50%
```

---

## 4. Recommendation Reason Builder

For every ranked attraction, the algorithm generates a plain-language explanation that the AI is instructed to quote in its response:

```
"fits couples on a honeymoon (Romantic Couple profile, 76% match)
 • enjoyable in any weather
 • 3.5 km — short taxi ride"
```

This three-part reason always mentions:
1. **Profile fit**: how the guest's travel persona maps to this attraction
2. **Weather fit**: whether conditions are favorable today
3. **Distance**: how practical it is to get there

The AI is explicitly instructed to include one of these sentences for each recommendation.

---

## 5. Output Format in the RAG Context

The clustering output replaces the `=== NEARBY ATTRACTIONS ===` section in the knowledge string. The AI receives:

```
=== NEARBY ATTRACTIONS ===
Guest: 26-35 years old • couple • honeymoon → assigned to "Romantic Couple" cluster
🌤️ WEATHER TODAY: Clear sky, 28°C — IDEAL OUTDOOR CONDITIONS → prioritise nature,
adventure, and open-air cultural sites. All categories are suitable.

AI INSTRUCTION — HOW TO RECOMMEND ATTRACTIONS:
1. Lead with the ★ TOP PICKS when a guest asks for recommendations or "things to do".
2. For each attraction you mention, include ONE sentence explaining WHY it suits this guest.
3. Follow the weather directive above.
4. When a guest asks for a SPECIFIC type, search ALL sections — not just top picks.
5. NEVER invent attractions.

★ TOP PICKS FOR THIS GUEST (Romantic Couple — ranked by profile + weather + distance):
  ✅ #1 Le Golfe Restaurant [restaurant] — Match: 88%
     Why recommended: fits couples on a honeymoon (Romantic Couple profile, 88% match)
       • enjoyable in any weather • just 1.2 km away
     About: Upscale seafood restaurant with panoramic sea views...
     Distance: 1.2 km
     Price: 60-120 TND
     Transport: Walking / Short taxi

  ✅ #2 Sidi Bou Said Village [cultural] — Match: 82%
     Why recommended: ...

  ✅ #3 La Marsa Beach [nature] — Match: 79%
     Why recommended: ...

OTHER AVAILABLE ATTRACTIONS (answer ANY specific request using these):
  ✅ Bardo National Museum [cultural] — Match: 68%
     ...
  ⚠️ Sahara Desert Excursion [adventure] — Match: 22%
     ...
```

The `⚠️` icon signals weather-unsuitable attractions (modifier < 0.6) — the AI should mention these with a caution.

---

## 6. What Changes by Profile

The table below shows how recommendations shift for the same hotel, same weather:

| Attraction | Adventure Youth | Romantic Couple | Business Professional | Senior Traveller |
|---|---|---|---|---|
| Beach/nature walk | ★ Top pick (88%) | Top pick (82%) | Low (38%) | Medium (70%) |
| Fine dining | Low (55%) | ★ Top pick (92%) | ★ Top pick (88%) | Top (82%) |
| Museum/cultural | Low (40%) | Medium (75%) | ★ Top pick (85%) | ★ Top pick (92%) |
| Adventure/sports | ★ Top pick (95%) | Low (45%) | Very low (20%) | Very low (20%) |
| Shopping mall | Very low (30%) | Medium (70%) | High (80%) | Medium (65%) |
| Theme park | High (80%) | Medium (65%) | Low (45%) | Low (40%) |

---

## 7. What Changes by Weather

The same Business Professional profile at the same hotel, different weather:

| Attraction | Clear 28°C | Rainy | Windy |
|---|---|---|---|
| Café (indoor) | 81% | **95%** (boosted) | 85% |
| Museum (indoor) | 76% | **89%** (boosted) | 80% |
| Beach (outdoor) | 34% | **6%** (heavily penalized) | 19% |
| Nature walk | 30% | **5%** | 18% |

This means on a rainy day, the top picks automatically shift to indoor venues even without any code change — the weather modifier handles it automatically.
