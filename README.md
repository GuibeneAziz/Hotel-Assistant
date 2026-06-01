# Tunisia Hotel Assistant — PFE Project

An AI-powered hotel concierge system built for Tunisian hotels, using Retrieval-Augmented Generation (RAG) to provide personalized guest assistance with multilingual support.

## Hotels Covered

| Hotel ID | Name | Location |
|---|---|---|
| `sindbad-hammamet` | Sindbad Hammamet | Hammamet, Tunisia |
| `villa-didon-carthage` | Villa Didon | Carthage, Tunis |
| `belvedere-fourati-tunis` | Belvedere El Fourati | Tunis |

---

## Technology Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | Next.js 14, React 18, Tailwind CSS | UI & pages |
| **UI Animations** | Framer Motion | Smooth transitions |
| **Charts** | Recharts | Analytics dashboard charts |
| **Backend** | Next.js API Routes (Node.js) | Server-side logic |
| **LLM** | LLaMA 3.3 70B via Groq API | Natural language generation |
| **Database** | PostgreSQL (NeonDB) | All persistent data |
| **DB Client** | `pg` (node-postgres) | PostgreSQL queries |
| **Caching** | Redis (Upstash) + in-process cache | Response & settings cache |
| **Authentication** | JWT (jsonwebtoken) | Admin route protection |
| **Password hashing** | bcryptjs | Secure admin passwords |
| **Input validation** | Zod | Schema validation |
| **XSS protection** | isomorphic-dompurify | HTML sanitization |
| **Internationalization** | Custom i18n context | 6 languages |
| **Weather API** | Open-Meteo (free, no key) | Real-time weather |
| **Attractions API** | OpenTripMap (optional) | Nearby places data |

---

## Project Structure

```
.
├── app/
│   ├── page.tsx                    # Landing page — hotel selection
│   ├── layout.tsx                  # Root layout with i18n provider
│   ├── globals.css                 # Global styles
│   ├── hotel/[id]/page.tsx         # Chatbot page (per hotel)
│   ├── admin/
│   │   ├── login/page.tsx          # Admin login
│   │   └── analytics/page.tsx      # Analytics dashboard
│   ├── dashboard/
│   │   ├── page.tsx                # Hotel settings dashboard
│   │   └── layout.tsx              # Dashboard layout with auth guard
│   ├── components/
│   │   ├── GuestRegistrationForm.tsx  # Guest profile form
│   │   ├── LanguageSwitcher.tsx       # Language selector component
│   │   ├── LoadingSpinner.tsx         # Loading UI
│   │   └── ErrorBoundary.tsx          # Error boundary
│   └── api/
│       ├── chat/route.ts              # Main chat endpoint
│       ├── hotel-settings/route.ts    # Read/write hotel settings
│       ├── weather/route.ts           # Weather proxy
│       ├── upload/route.ts            # Image upload
│       ├── reservations/route.ts      # Reservation management
│       ├── admin/
│       │   ├── login/route.ts         # Admin authentication
│       │   ├── verify/route.ts        # JWT token verification
│       │   ├── attractions/route.ts   # Manage attractions
│       │   └── reservations/route.ts  # Admin reservation view
│       └── analytics/
│           ├── overview/route.ts      # Analytics overview
│           ├── dashboard/route.ts     # Dashboard data
│           ├── demographics/route.ts  # Guest demographics
│           ├── questions/route.ts     # Question category stats
│           └── guest-profile/route.ts # Profile queries
│
├── lib/
│   ├── ai-service.ts               # Groq LLM client + system prompt
│   ├── rag-knowledge.ts            # Build hotel knowledge string (RAG)
│   ├── attraction-clustering.ts    # K-Means recommendation engine
│   ├── analytics.ts                # Analytics helpers (track, query)
│   ├── db.ts                       # PostgreSQL pool + hotel settings loader
│   ├── redis.ts                    # Redis client with in-memory fallback
│   ├── rate-limiter.ts             # Sliding-window rate limiter
│   ├── rate-limit-helper.ts        # Apply rate limit to routes
│   ├── validation.ts               # Zod schemas + XSS sanitization
│   ├── password.ts                 # bcrypt helpers
│   ├── session-state.ts            # Guest session management
│   ├── env.ts                      # Environment variable validation
│   ├── i18n.tsx                    # i18n context + English dictionary
│   └── locales/
│       ├── fr.ts                   # French translations
│       ├── ar.ts                   # Arabic translations
│       ├── es.ts                   # Spanish translations
│       ├── de.ts                   # German translations
│       └── it.ts                   # Italian translations
│
├── scripts/
│   ├── redesign-database.sql       # Full database schema (canonical)
│   ├── add-reservations.sql        # Reservations table schema
│   ├── seed-attractions.js         # Seed curated attraction data
│   ├── fetch-attractions.js        # Fetch from OpenTripMap API
│   ├── add-attraction-coords.js    # Add lat/lon to nearby_attractions
│   ├── fix-attraction-images.js    # Update attraction image URLs
│   ├── backup-database.js          # Database backup utility
│   ├── hash-password.js            # Generate admin password hash
│   └── seed-special-events.sql     # Sample events seed data
│
├── types/
│   ├── api.ts                      # API response types
│   └── hotel.ts                    # Hotel data types
│
├── prisma/migrations/              # Database migration history
├── public/uploads/events/          # Uploaded event images
└── middleware.ts                   # Next.js middleware (route protection)
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
DATABASE_URL=postgresql://...         # NeonDB connection string
GROQ_API_KEY=gsk_...                  # Groq AI API key
REDIS_URL=redis://...                 # Upstash Redis URL (optional)
JWT_SECRET=...                        # Random secret for admin JWT
ADMIN_PASSWORD_HASH=...               # bcrypt hash of admin password
OPENTRIPMAP_API_KEY=...               # Optional, for attraction fetching
```

### 3. Set up the database

Run the schema SQL on your PostgreSQL database:

```bash
psql $DATABASE_URL -f scripts/redesign-database.sql
```

### 4. Seed attraction data

```bash
node scripts/seed-attractions.js
```

Or fetch live data from OpenTripMap:

```bash
node scripts/fetch-attractions.js sindbad-hammamet 15 YOUR_OTM_KEY
```

### 5. Start the dev server

```bash
npm run dev
# App runs on http://localhost:3001
```

---

## Documentation

| File | Description |
|---|---|
| `docs/01-ARCHITECTURE.md` | Full system architecture and request flow |
| `docs/02-DATABASE.md` | Database schema, all tables explained |
| `docs/03-CHATBOT-RAG.md` | How the RAG chatbot works, step by step |
| `docs/04-RECOMMENDATION.md` | K-Means clustering recommendation engine |
| `docs/05-ANALYTICS.md` | Analytics tracking and dashboard system |
| `docs/06-SECURITY.md` | Security measures (JWT, rate limiting, XSS, etc.) |
| `docs/07-ADMIN.md` | Admin dashboard features and usage |
| `docs/08-DATA-COLLECTION.md` | How attraction data is collected and stored |
| `docs/09-INTERNATIONALIZATION.md` | Multi-language support (6 languages) |
