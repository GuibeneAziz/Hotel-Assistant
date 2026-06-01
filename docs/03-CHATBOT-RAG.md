# Chatbot & RAG System — Tunisia Hotel Assistant

## 1. What is RAG?

RAG stands for **Retrieval-Augmented Generation**. The core idea is:

> Instead of training an AI model on hotel-specific data (expensive and slow), you **retrieve** the relevant data at runtime from a database and **inject** it into the AI's prompt. The AI generates a response based on what it just read, not on what it was trained on.

**Why this approach?**
- The AI (LLaMA 3.3) knows nothing about Villa Didon's pool hours, Sindbad's spa treatments, or today's events. That data lives in a PostgreSQL database, not in the model's weights.
- By injecting the database content into the system prompt, the AI can answer questions accurately and in real-time — if the admin changes the pool hours at noon, the AI knows by the next message.
- This also prevents hallucination: the system prompt explicitly forbids the AI from inventing information.

---

## 2. Why This RAG Architecture (Not Vectors/Embeddings)?

A classical RAG system uses:
- Vector embeddings (convert text to numbers via BERT/Ada/etc.)
- A vector database (Pinecone, Weaviate, ChromaDB)
- Cosine similarity search to find the most relevant "chunks"

**We chose NOT to use this because our data is structured, not unstructured.**

| Classical RAG | Our approach |
|---|---|
| Designed for unstructured documents (PDFs, articles) | Our data is relational (SQL tables with clear fields) |
| Finds relevant chunks via semantic similarity | We select relevant sections via SQL + keyword filter |
| Adds ~300ms overhead for embedding computation | No embedding overhead |
| Requires a vector database service | We already have PostgreSQL |
| Black-box relevance scoring | Transparent, deterministic section selection |

**The bottom line**: Semantic embedding search solves the problem of finding the right paragraph in a 1000-page document. We don't have that problem — our "documents" are structured tables with named fields (pool hours, event titles, etc.). Deterministic retrieval is more accurate and faster for this domain.

The ML component of the system is in the **recommendation engine** (K-Means clustering), which is the appropriate place for machine learning. See `docs/04-RECOMMENDATION.md`.

---

## 3. The Knowledge Builder (`lib/rag-knowledge.ts`)

The function `buildHotelKnowledge()` assembles all retrieved database data into a structured plain-text document. This document is called the **hotel knowledge string**.

### Structure of the knowledge string

```
=== CONTACT INFORMATION ===
Front Desk Phone: +216 71 XXX XXX
Email: contact@villadidon.com
Emergency Phone: +216 71 XXX XXX

IMPORTANT: For bookings, reservations, or any services that require action,
guests must contact the front desk directly. The AI assistant can ONLY provide
information, not make bookings or arrangements.

=== HOTEL INFORMATION ===
Name: Villa Didon
Location: Carthage, Tunis, Tunisia
Description: ...

=== FACILITIES ===
Pool: OPEN
  Hours: 08:00 - 20:00
Gym/Fitness Center: OPEN
  Hours: 07:00 - 21:00
Spa: OPEN
  Hours: 09:00 - 19:00
  Treatments: Swedish Massage, Hammam, Hot Stone Therapy

=== RESTAURANT SCHEDULE ===
Breakfast: OPEN 07:00 - 10:30
Lunch: OPEN 12:30 - 15:00
Dinner: OPEN 19:00 - 22:30

=== SPECIAL EVENTS ===
TODAY'S EVENTS:
  - Gala Dinner
    Time: 20:00
    Location: Terrace Restaurant
    Price: 120 TND
    Details: ...
UPCOMING EVENTS:
  - Wine Tasting on 2026-06-05
    Time: 18:30, Location: Bar Lounge
    Price: 45 TND

=== NEARBY ATTRACTIONS ===
(see section 5 below — this section is replaced with personalized content)

=== AMENITIES ===
WiFi: Available
  Password: VillaDidon2024
Parking: Available
  Price: 10 TND/day

=== CHECK-IN/CHECK-OUT ===
Check-in: 14:00
Check-out: 12:00

=== CURRENT WEATHER ===
Temperature: 28°C (feels like 27°C)
Conditions: Clear sky
Humidity: 55%
Wind Speed: 12 km/h
Weather Directive: 🌤️ IDEAL WEATHER (28°C) — perfect for outdoor activities,
pool, beach, and nature visits.
```

---

## 4. Context Filtering (`extractRelevantContext`)

Before sending the full knowledge string to the LLM, the system tries to reduce it to only the relevant sections. This:
- Saves tokens (cheaper, faster)
- Keeps the AI focused on what the guest is actually asking about

### How it works

```typescript
const keywords = {
  'pool'        → ['FACILITIES'],
  'gym'         → ['FACILITIES'],
  'restaurant'  → ['RESTAURANT SCHEDULE'],
  'breakfast'   → ['RESTAURANT SCHEDULE'],
  'nearby'      → ['NEARBY ATTRACTIONS'],
  'attraction'  → ['NEARBY ATTRACTIONS'],
  'wifi'        → ['AMENITIES'],
  'check'       → ['CHECK-IN/CHECK-OUT'],
  'weather'     → ['CURRENT WEATHER'],
  'event'       → ['SPECIAL EVENTS'],
  ...
}
```

The function scans the user's message for these keywords and returns only the matching sections, always including `CONTACT INFORMATION` and `HOTEL INFORMATION` as a baseline.

### Safety fallback

If the filtered result is shorter than 250 characters (keyword matched nothing meaningful), **the full knowledge string is returned**. This ensures the AI is never left with too little context.

---

## 5. Attraction Section — Personalized vs. Standard

The `nearby_attractions` section of the knowledge string is special. It has two modes:

**Standard mode** (no guest profile):
All attractions are listed flat, grouped by category, with basic info.

**Personalized mode** (guest profile registered):
The attractions section is replaced with the output of the K-Means clustering engine, which:
- Assigns the guest to a travel persona cluster
- Scores and ranks all attractions based on: profile affinity × weather modifier × distance penalty
- Marks the top 3 as `★ TOP PICKS`
- Includes a `Why recommended:` sentence for each attraction

The full details of this mechanism are in `docs/04-RECOMMENDATION.md`.

---

## 6. The AI Service (`lib/ai-service.ts`)

### Model

- **Provider**: Groq (API endpoint)
- **Model**: `llama-3.3-70b-versatile`
- **Temperature**: 0.7 (balanced creativity vs. accuracy)
- **Max tokens**: 500 (keeps responses concise)
- **Stream**: false (standard request/response, no streaming)

### System Prompt Structure

The system prompt sent to the AI has four parts:

**Part 1 — Role definition**
```
You are a helpful, friendly hotel concierge AI assistant for a luxury hotel in Tunisia.
YOUR ROLE AND CAPABILITIES: You are an INFORMATION-ONLY assistant. You can ONLY:
- Answer questions about hotel facilities, schedules, and services
...
```

**Part 2 — Critical rules (what the AI must never do)**
```
CRITICAL RULES:
🚫 NEVER make up information or guess
🚫 NEVER provide information that is not in the hotel data below
🚫 NEVER use placeholder text like "[phone number]" — always use REAL values
...
WHAT YOU CANNOT DO:
❌ You CANNOT book rooms, taxis, tours, or make any reservations
❌ You CANNOT process payments or handle financial transactions
...
```

**Part 3 — Attraction recommendation flow (3-step guide)**

The AI is instructed to follow a mandatory 3-step flow for attraction queries:

```
STEP 1 — When the guest first asks about things to do / nearby attractions:
  Ask exactly 1 short clarifying question based on their profile.
  Examples:
  - If couple: "Are you looking for something romantic or more active?"
  - If family: "Are the kids into outdoor fun or cultural visits?"
  - If unknown: "Do you prefer outdoor activities or indoor visits?"
  Keep to 2-3 sentences MAXIMUM. Do NOT list any attractions yet.

STEP 2 — Once the guest answers:
  Suggest exactly 2 or 3 attractions that best match their answer.
  For each: name, category, what it is, why it fits their preference.
  End with: "Which one would you like to know more about?"

STEP 3 — When the guest picks a specific attraction:
  Provide full details: description, distance, duration, price, transport.
  Include the recommendation reason from hotel data.
  Mention the weather directive if relevant.
  (A photo appears automatically — no need to mention it.)
```

The rule is marked `⚠️ MANDATORY` to prevent the AI from skipping Step 1 even if it already knows the guest's profile.

**Part 4 — Hotel knowledge (injected context)**
```
HOTEL INFORMATION (THIS IS YOUR ONLY SOURCE OF TRUTH):
=== CONTACT INFORMATION ===
...
[full knowledge string]
```

### Conversation history

The API receives the last 6 turns of conversation from the client:
```javascript
const messages = [
  { role: "system", content: systemPrompt },
  ...conversationHistory.slice(-6),   // last 6 turns
  { role: "user", content: userMessage }
]
```

This gives the AI short-term memory — it knows what was just discussed, so guests can say "tell me more about the first one" and the AI understands what "the first one" refers to.

---

## 7. Image Injection (Post-Processing)

After the AI returns its text response, two functions scan it and append image tags where appropriate.

### Event images (`appendEventImages`)

If the AI's response mentions an event title word AND that event has an `image_url` in the database → append `[IMAGE:url]` at the end of the response.

### Attraction images (`appendAttractionImages`)

Triggered only when all three conditions are true:
1. Response is longer than 500 characters (Step 3 detail responses are 500+; Step 1 questions and Step 2 shortlists are shorter)
2. Response does NOT contain "Which one would you like to know more about?" (that phrase marks a Step 2 shortlist)
3. The response mentions a word from an attraction's name that has an `image_url`

If triggered, appends:
```
📸 **Attraction Name**
[IMAGE:https://upload.wikimedia.org/...]
```

### Frontend rendering

The chatbot page (`app/hotel/[id]/page.tsx`) scans each AI message for `[IMAGE:url]` patterns and renders them using Next.js `<Image>` component. The `next.config.js` file lists all allowed image domains in `images.remotePatterns` (includes `upload.wikimedia.org`).

---

## 8. Caching

### Redis cache (Upstash)

For stateless questions (no conversation history), responses are cached in Redis:
```
cache key = "ai:response:" + MD5(message + context)
TTL = 3600 seconds (1 hour)
```

This means if 20 different guests at the same hotel ask "what is the wifi password?", only the first call hits Groq. The other 19 get the cached response instantly.

### Cache bypass conditions

The cache is **not used** when:
- The message has `conversationHistory.length > 0` (multi-turn conversations are always fresh)
- The hotel context changed (different hotels produce different cache keys)

### Fallback when Redis is unavailable

If Redis is down or not configured, `lib/redis.ts` provides an in-process memory fallback (`Map<string, { value, expiresAt }>`). The system never crashes due to Redis being unavailable.

---

## 9. Rate Limiting

The chat endpoint is protected by a sliding-window rate limiter (`lib/rate-limiter.ts`):

| Endpoint type | Limit |
|---|---|
| Chat (`/api/chat`) | 100 requests per 15 minutes per IP |
| Authentication (`/api/admin/login`) | 5 attempts per 15 minutes per IP |
| General API | 50 requests per 15 minutes per IP |
| Admin/Analytics | 30 requests per 15 minutes per IP |

The rate limiter is **in-process** (uses a `Map` in Node.js memory), not Redis-backed. This is appropriate for a hotel assistant — guests are real humans typing, not bots generating thousands of requests per second.

---

## 10. Chatbot Flow Diagram

```
Guest opens /hotel/villa-didon-carthage
       │
       ▼
Guest fills registration form
  (age range, nationality, travel purpose, group type)
       │
       ├─ POST /api/analytics/guest-profile → saves to guest_profiles
       │
       ▼
Guest types: "What can I do nearby?"
       │
       ▼
POST /api/chat
  { message: "What can I do nearby?",
    hotelData: { id: "villa-didon-carthage", ... },
    weather: { temperature: 28, description: "Clear", ... },
    sessionId: "sess_abc123",
    conversationHistory: [] }
       │
       ▼
Rate limit check → OK
Input validation → OK
Load hotel settings from cache → OK
Fetch guest profile (sess_abc123) → { couple, 26-35, honeymoon }
       │
       ▼
buildPersonalizedHotelKnowledge():
  K-Means assigns couple/honeymoon profile → "Romantic Couple" cluster
  Ranks all Villa Didon attractions by: restaurant(92%) > cafe(88%) > nature(82%)
  Top 3 flagged as ★ recommendations with "Why recommended:" sentences
       │
       ▼
extractRelevantContext("What can I do nearby?"):
  Keyword "nearby" → include NEARBY ATTRACTIONS section
  Result > 250 chars → use filtered context
       │
       ▼
generateResponse():
  System prompt: rules + hotel context (with ranked attractions)
  LLaMA 3.3 70B receives context → follows Step 1 rule
  AI responds: "Are you looking for something romantic and scenic,
               or something more active and adventurous?"
       │
       ▼
appendAttractionImages(): response < 500 chars → skip
appendEventImages(): no event mentioned → skip
       │
       ▼
Return: { success: true, response: "Are you looking for something romantic..." }
       │
       ▼
Guest types: "Romantic and scenic"
  → Step 2: AI lists 3 romantic attractions with brief descriptions
       │
       ▼
Guest types: "Tell me more about the first one"
  → Step 3: AI gives full details + photo appended
```
