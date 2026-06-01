# Architecture — Tunisia Hotel Assistant

## 1. Overview

The application is a multi-tenant hotel assistant platform. Each hotel has its own dedicated chatbot page. Guests interact with an AI assistant that knows everything about the hotel (facilities, events, weather, nearby attractions) because that data is retrieved from the database and injected into the AI's prompt at runtime — this is the RAG architecture.

The system has three main user-facing surfaces:

| Surface | URL | Who uses it |
|---|---|---|
| Landing page | `/` | Guests — choose their hotel |
| Chatbot | `/hotel/[hotelId]` | Guests — chat with the AI |
| Admin dashboard | `/dashboard` | Hotel staff — manage settings |
| Analytics | `/admin/analytics` | Hotel staff — view statistics |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER (Guest)                        │
│                                                                 │
│   Landing Page  ──►  Hotel Chatbot Page  ──►  Chat Messages     │
│   (hotel list)        /hotel/[id]              ↕ WebFetch       │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTP POST /api/chat
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER (API Routes)                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /api/chat                                         │   │
│  │                                                         │   │
│  │  1. Rate limit check (in-memory sliding window)         │   │
│  │  2. Input validation + XSS sanitization (Zod + DOMPur.) │   │
│  │  3. Load hotel settings from DB (with 5-min cache)      │   │
│  │  4. Fetch guest profile from DB (by sessionId)          │   │
│  │  5. Build hotel knowledge string (RAG context)          │   │
│  │     ├─ If guest profile exists → K-Means personalization│   │
│  │     └─ Otherwise → standard knowledge                   │   │
│  │  6. Extract relevant sections (keyword filter)          │   │
│  │  7. Call Groq API (LLaMA 3.3 70B)                       │   │
│  │  8. Append event/attraction images                      │   │
│  │  9. Return JSON response                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐          ┌────────────────────────────┐
│   PostgreSQL (Neon) │          │   Groq API (External)      │
│                     │          │                            │
│  hotels             │          │  Model: LLaMA 3.3 70B      │
│  facilities         │          │  max_tokens: 500           │
│  contact_info       │          │  temperature: 0.7          │
│  amenities          │          │                            │
│  special_events     │          └────────────────────────────┘
│  hotel_activities   │
│  nearby_attractions │          ┌────────────────────────────┐
│  guest_profiles     │          │   Open-Meteo API (free)    │
│  question_categories│          │   Real-time weather data   │
│  popular_topics     │          └────────────────────────────┘
│  reservations       │
└─────────────────────┘          ┌────────────────────────────┐
                                 │   Redis (Upstash)          │
                                 │   AI response cache 1h     │
                                 │   (optional, has fallback) │
                                 └────────────────────────────┘
```

---

## 3. Request Lifecycle — Chat Message

This traces exactly what happens from the moment a guest sends "What time does the pool close?" to receiving the response.

```
1. BROWSER
   User types message → POST /api/chat
   Body: { message, hotelData, weather, conversationHistory, sessionId }

2. RATE LIMITING  [lib/rate-limit-helper.ts]
   Check: has this IP sent > 100 requests in the last 15 minutes?
   If yes → HTTP 429 Too Many Requests
   If no  → continue

3. INPUT VALIDATION  [lib/validation.ts]
   Zod schema validates structure (message length, types)
   DOMPurify strips all HTML from every string field (XSS protection)
   If invalid → HTTP 400 Bad Request

4. DATABASE QUERY  [lib/db.ts → getAllHotelSettings()]
   Check in-process cache (5-minute TTL)
   If cache miss → 6 parallel SQL queries:
     - SELECT from facilities
     - SELECT from contact_info
     - SELECT from amenities
     - SELECT from special_events
     - SELECT from hotel_activities
     - SELECT from nearby_attractions
   Assemble into a "hotel settings" object

5. GUEST PROFILE LOOKUP  [lib/analytics.ts → getGuestProfile()]
   SELECT from guest_profiles WHERE session_id = $1
   Returns: age_range, group_type, travel_purpose, nationality
   (Non-blocking: update interaction count in background)

6. BUILD RAG CONTEXT  [lib/rag-knowledge.ts]
   IF guest profile found:
     → buildPersonalizedHotelKnowledge()
       Runs K-Means clustering on guest profile
       Returns attractions ranked by: profile affinity × weather × distance
   ELSE:
     → buildHotelKnowledge()
       Returns full hotel knowledge in flat sections

   Output example:
   === CONTACT INFORMATION ===
   Front Desk Phone: +216 XX XXX XXX
   === FACILITIES ===
   Pool: OPEN  Hours: 08:00 - 20:00
   === CURRENT WEATHER ===
   Temperature: 28°C | Conditions: Clear
   Weather Directive: 🌤️ IDEAL WEATHER — perfect for outdoor activities
   ...

7. CONTEXT FILTERING  [lib/rag-knowledge.ts → extractRelevantContext()]
   Match query keywords against section headers:
   "pool" → include only FACILITIES + CONTACT sections
   If filtered result < 250 chars → send full knowledge (safety fallback)

8. CHECK REDIS CACHE  [lib/ai-service.ts]
   If no conversation history → check cache
   Cache key = MD5(message + context)
   If cache hit → return cached response immediately (skip Groq call)

9. CALL GROQ API  [lib/ai-service.ts → generateResponse()]
   Messages array:
   [
     { role: "system", content: systemPrompt + hotelContext },
     ...last 6 conversation turns,
     { role: "user", content: userMessage }
   ]
   Model: llama-3.3-70b-versatile
   Temp: 0.7, max_tokens: 500

10. CACHE RESPONSE  [lib/ai-service.ts]
    If no conversation history → cache AI response in Redis for 1 hour

11. IMAGE INJECTION  [app/api/chat/route.ts]
    appendEventImages(): if response mentions an event with a photo → append [IMAGE:url]
    appendAttractionImages(): if response is > 500 chars AND is a Step-3 detail reply
      AND mentions an attraction name → append 📸 [IMAGE:url]

12. RETURN RESPONSE
    HTTP 200: { success: true, response: "The pool closes at 8 PM..." }
```

---

## 4. Frontend Architecture

The chatbot page (`app/hotel/[id]/page.tsx`) is a client-side React component. Key behaviors:

- **Session management**: A `sessionId` is generated at page load and sent with every chat message to track the guest across turns.
- **Guest registration**: On first load, if no session exists, `GuestRegistrationForm` collects: age range, nationality, travel purpose, group type. This data is saved to `guest_profiles` and powers the personalized recommendation engine.
- **Conversation history**: The last 6 turns are stored in React state and sent to the API with each message, giving the AI short-term memory.
- **Image rendering**: The component parses `[IMAGE:url]` tags in the AI response and renders them as `<Image>` elements using Next.js `next/image`.
- **Language detection**: The `LanguageSwitcher` component changes the UI language. The AI detects the guest's message language and responds in kind independently.
- **Weather**: Fetched from Open-Meteo API at page load (free, no API key required), sent with every chat message.

---

## 5. Admin Architecture

The admin dashboard (`/dashboard`) is protected by:
1. **Middleware** (`middleware.ts`): Checks for a valid `admin_token` cookie on all `/dashboard` and `/api/admin/*` routes. Redirects to `/admin/login` if missing.
2. **API verification** (`/api/admin/verify`): Verifies the JWT on every dashboard page load.

When the admin saves hotel settings:
1. `/api/hotel-settings` receives the new settings object.
2. It runs `UPDATE` or `INSERT` SQL statements on all relevant tables.
3. It calls `invalidateHotelSettingsCache()` to clear the in-process cache.
4. Next chat request will re-load fresh settings from the database.

---

## 6. Performance Optimizations

| Optimization | Location | Effect |
|---|---|---|
| In-process settings cache (5 min TTL) | `lib/db.ts` | Avoids 6 SQL queries per chat message |
| Redis response cache (1 h TTL) | `lib/ai-service.ts` | Returns cached response for identical questions |
| 6 parallel DB queries | `lib/db.ts` | Reduces DB round-trips from O(N×6) to O(1) |
| Non-blocking analytics writes | `app/api/chat/route.ts` | Analytics never delay the AI response |
| Context filtering | `lib/rag-knowledge.ts` | Sends smaller prompt to LLM → faster, cheaper |
| NeonDB connection pool | `lib/db.ts` | 20 reusable connections, no reconnect overhead |
