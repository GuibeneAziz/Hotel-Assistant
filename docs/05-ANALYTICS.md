# Analytics System — Tunisia Hotel Assistant

## 1. Purpose

The analytics system collects anonymized behavioral data about how guests use the chatbot. Hotel managers can view this data on the analytics dashboard to:
- Understand what guests ask about most (pool hours? restaurant? wifi?)
- See the demographic profile of their clientele (age, nationality, travel purpose)
- Identify which topics are popular or problematic
- Track usage trends over time

**Privacy principle**: No raw chat messages are stored. Only aggregated category counts and anonymized profile attributes are recorded.

---

## 2. What Is Tracked

### 2.1 Guest Profiles (`guest_profiles` table)

When a guest opens the chatbot and fills in the registration form, a profile row is created:
- Age range (18-25, 26-35, 36-50, 50+)
- Nationality
- Travel purpose (leisure, business, family, honeymoon)
- Group type (solo, couple, family, group)
- Session ID (anonymous UUID — not linked to any personal identity)
- First visit / last visit timestamps
- Total interaction count

**On each subsequent message**: the `total_interactions` counter increments and `last_visit` is updated via `ON CONFLICT DO UPDATE`. This is done **in the background** (fire-and-forget) so it never delays the AI response.

### 2.2 Question Categories (`question_categories` table)

Every guest message is analyzed by `detectQuestionCategory()` in `lib/analytics.ts`. This function classifies the message into:

| Category | Subcategory examples |
|---|---|
| `facilities` | `pool_hours`, `spa_prices`, `gym_access`, `kids_club` |
| `dining` | `breakfast_time`, `lunch_time`, `dinner_time` |
| `activities` | `hotel_activities`, `nearby_attractions` |
| `amenities` | `wifi_password`, `parking_info` |
| `booking` | `checkin_time`, `checkout_time` |
| `weather` | `current_weather` |
| `events` | `special_events` |
| `location` | `hotel_location` |
| `general` | `general_inquiry` |

The count is **aggregated by day**: one row per `(hotel_id, category, subcategory, date)`. If the same subcategory is asked 10 times on the same day, the row's `question_count` is incremented 10 times — not 10 new rows.

**Age-group breakdown**: The row also tracks which age group asked the question (`age_18_25`, `age_26_35`, etc.), so managers can see e.g. "young guests ask about activities most, older guests ask about dining."

### 2.3 Popular Topics (`popular_topics` table)

After category detection, individual topic keywords extracted from the message are tracked (e.g. `pool`, `beach`, `wifi`, `breakfast`). Aggregated by day per hotel, with optional sentiment tracking (positive/negative).

---

## 3. Language & Category Detection (`lib/analytics.ts`)

### Language detection

The system detects the guest's language from their message:

```
1. Check for Arabic Unicode characters (U+0600 to U+06FF) → return 'ar'
2. Check for French keywords (bonjour, merci, piscine, chambre...) → return 'fr'
3. Check for German keywords (guten, danke, schwimmbad...) → return 'de'
4. Check for Spanish keywords (hola, gracias, piscina...) → return 'es'
5. Check for Italian keywords (ciao, grazie, piscina...) → return 'it'
6. Default → return 'en'
```

This is a **rule-based approach** (keyword matching), not ML-based language detection. It is accurate enough for hotel queries where guests tend to use common vocabulary.

### Category detection

Keywords are defined in multiple languages for each category:

```javascript
pool: ['pool', 'swimming', 'swim', 'piscine', 'schwimmbad', 'alberca', 'مسبح']
spa:  ['spa', 'massage', 'treatment', 'hammam', 'wellness', 'سبا', 'تدليك']
wifi: ['wifi', 'internet', 'password', 'mot de passe', 'passwort', 'واي فاي']
...
```

The detection is run against the guest's message and returns a `{ category, subcategory, topics, language }` object.

---

## 4. Analytics Dashboard

The admin analytics page (`/admin/analytics`) fetches data from 5 API endpoints:

| Endpoint | Returns |
|---|---|
| `GET /api/analytics/overview` | Total interactions, unique guests, top categories |
| `GET /api/analytics/dashboard` | Daily trends, question distribution |
| `GET /api/analytics/demographics` | Guest age/nationality/purpose/group breakdown |
| `GET /api/analytics/questions` | Top 10 most asked question categories |
| `GET /api/analytics/guest-profile` | Guest profile statistics |

### Visualizations (using Recharts)

- **Bar chart**: Most asked question categories (last 30 days)
- **Pie chart**: Guest demographics breakdown (group type, travel purpose)
- **Line chart**: Daily interaction trends
- **Table**: Top topics with mention counts

---

## 5. Analytics Query Examples

### Most asked questions (last 30 days)

```sql
SELECT category, subcategory,
       SUM(question_count) as total_count,
       MAX(last_asked) as last_asked
FROM question_categories
WHERE hotel_id = 'villa-didon-carthage'
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category, subcategory
ORDER BY total_count DESC
LIMIT 10;
```

Typical result: `facilities/pool_hours = 143`, `dining/breakfast_time = 112`, `amenities/wifi_password = 98`

### Guest demographics

```sql
SELECT age_range, nationality, travel_purpose, group_type, COUNT(*) as count
FROM guest_profiles
WHERE hotel_id = 'sindbad-hammamet'
  AND first_visit >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY age_range, nationality, travel_purpose, group_type
ORDER BY count DESC;
```

### Popular topics

```sql
SELECT topic, SUM(mention_count) as total_mentions
FROM popular_topics
WHERE hotel_id = 'belvedere-fourati-tunis'
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY topic
ORDER BY total_mentions DESC
LIMIT 10;
```

---

## 6. Data Flow

```
Guest sends message "quelle est l'heure de la piscine?"
         │
         ▼
detectQuestionCategory(message):
  → language: 'fr' (found "piscine")
  → category: 'facilities'
  → subcategory: 'pool_hours'
  → topics: ['pool']
         │
         ▼ (fire-and-forget, non-blocking)
trackQuestionCategory(hotelId, 'facilities', 'pool_hours', '26-35')
  → INSERT INTO question_categories ... ON CONFLICT DO UPDATE SET question_count + 1
  → Also increments age_26_35 column
         │
trackPopularTopic(hotelId, 'pool')
  → INSERT INTO popular_topics ... ON CONFLICT DO UPDATE SET mention_count + 1
         │
         ▼ (does NOT delay AI response)
AI response generated and returned to guest
```

The analytics writes are wrapped in `.catch(() => {/* ignore */})` — if the analytics DB write fails for any reason, the guest's AI response is unaffected.

---

## 7. What Analytics Data Tells the Hotel

| Insight | Query to look at |
|---|---|
| "What do guests ask about most?" | `question_categories` by `question_count DESC` |
| "Which age group asks most about facilities?" | `question_categories.age_26_35` vs others |
| "Where do most guests come from?" | `guest_profiles.nationality` |
| "Do business travelers ask different questions?" | Filter `guest_profiles.travel_purpose = 'business'` |
| "Is wifi a common concern?" | `popular_topics WHERE topic = 'wifi'` |
| "How long do guests chat?" | `guest_profiles.total_interactions` average |
