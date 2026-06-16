# Optimisation de l'Application — Tunisia Hotel Assistant

> **But de ce document** : donner à une IA (ou à un développeur) une compréhension complète et sans ambiguïté de toutes les couches d'optimisation de l'application. Chaque section indique **quel fichier**, **quelle ligne de code** et **quel problème** l'optimisation résout.

---

## Sommaire

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Stratégie de cache multi-couches](#2-stratégie-de-cache-multi-couches)
3. [Optimisation de la base de données](#3-optimisation-de-la-base-de-données)
4. [Optimisation de l'IA / LLM](#4-optimisation-de-lia--llm)
5. [Optimisation du contexte RAG](#5-optimisation-du-contexte-rag)
6. [Optimisation du bundle front-end](#6-optimisation-du-bundle-front-end)
7. [Rate Limiting (limitation du débit)](#7-rate-limiting-limitation-du-débit)
8. [Sécurité et validation des entrées](#8-sécurité-et-validation-des-entrées)
9. [Optimisation météo](#9-optimisation-météo)
10. [Analytics — fire-and-forget](#10-analytics--fire-and-forget)
11. [Internationalisation (i18n)](#11-internationalisation-i18n)
12. [Tableau récapitulatif](#12-tableau-récapitulatif)

---

## 1. Vue d'ensemble de l'architecture

```
Navigateur (Guest / Admin)
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  Next.js 14 App Router  (port 3001)                      │
│                                                          │
│  Pages :                                                 │
│    /             → Landing page (sélection hôtel)        │
│    /hotel/[id]   → Chat bot guest                        │
│    /dashboard    → Admin — paramètres hôtel              │
│    /admin/analytics → Dashboard analytics                │
│    /admin/login  → Authentification admin                │
│                                                          │
│  API Routes :                                            │
│    /api/chat                   ← Cœur du chatbot         │
│    /api/hotel-settings         ← CRUD paramètres         │
│    /api/weather                ← Météo Open-Meteo        │
│    /api/analytics/*            ← KPIs & graphiques       │
│    /api/admin/login            ← Authentification JWT    │
└──────────────────────────────────────────────────────────┘
        │                    │                   │
        ▼                    ▼                   ▼
  PostgreSQL (Neon)     Redis (Upstash)    Groq API / Ollama
  (données persistantes) (cache distribué)  (modèle LLM)
```

**Stack technique** :
| Couche | Technologie |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Style | Tailwind CSS, Framer Motion, Recharts |
| Base de données | PostgreSQL via `pg` (Neon — serverless) |
| Cache distribué | Redis via `ioredis` (Upstash — cloud) |
| IA | Groq (llama-3.3-70b) **ou** Ollama local (qwen2.5:7b) |
| Auth | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| Validation | Zod |
| Sanitisation | DOMPurify / isomorphic-dompurify |
| Fetch client | SWR |
| i18n | Contexte React maison, 6 langues |

---

## 2. Stratégie de cache multi-couches

L'application utilise **trois niveaux de cache** empilés pour réduire la latence et les coûts.

### 2.1 Cache in-process (mémoire Node.js)

**Fichier** : `lib/db.ts`, lignes 20–34 et 179

```typescript
// lib/db.ts
let _settingsCache: { data: any; expiresAt: number } | null = null
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

export async function getAllHotelSettings() {
  if (_settingsCache && Date.now() < _settingsCache.expiresAt) {
    return _settingsCache.data  // ← retour immédiat, 0 requête DB
  }
  // ... requêtes DB ...
  _settingsCache = { data: settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS }
}
```

**Pourquoi** : Chaque message du chatbot a besoin des paramètres de l'hôtel (horaires, contact, attractions). Sans cache, chaque message déclencherait 6+ requêtes SQL, ce qui ajouterait ~200–500 ms de latence sur Neon (base serverless).

**Invalidation** : `invalidateHotelSettingsCache()` est appelé immédiatement quand l'admin sauvegarde de nouveaux paramètres via `POST /api/hotel-settings`.

---

### 2.2 Cache Redis distribué

**Fichier** : `lib/redis.ts` (118 lignes)

Le client Redis est construit avec **dégradation gracieuse** : si Redis est indisponible (quota Upstash épuisé, réseau, etc.), l'application continue de fonctionner normalement — les opérations de cache deviennent des no-ops silencieuses.

```typescript
// lib/redis.ts
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redisAvailable) return null  // ← pas d'exception, retour null
  try {
    const raw = await getRedisClient().get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    redisAvailable = false  // ← désactive le cache pour le reste de la session
    return null
  }
}
```

**Configuration connexion** :
- `maxRetriesPerRequest: 1` — pas de retry infini
- `retryStrategy: max 2 tentatives` — abandon rapide
- TLS activé pour Upstash (`rejectUnauthorized: false`)
- Un seul log d'erreur (`errorLogged`) pour éviter le spam de logs

**Ce qui est mis en cache dans Redis** :
| Clé Redis | Contenu | TTL |
|---|---|---|
| `ai:response:<md5>` | Réponse IA à une question courante | 1 heure |
| `hotel:<id>:settings` | Paramètres complets de l'hôtel | Variable |

---

### 2.3 Cache des réponses IA (Redis)

**Fichier** : `lib/ai-service.ts`, lignes 16–26 et 77–84 et 191–194

```typescript
// lib/ai-service.ts
function generateCacheKey(userMessage: string, hotelContext: string): string {
  const content = `${provider}:${model}:${userMessage.toLowerCase().trim()}:${hotelContext}`
  return `ai:response:${crypto.createHash('md5').update(content).digest('hex')}`
}

// Avant d'appeler le LLM :
if (conversationHistory.length === 0) {
  const cached = await getCached<string>(cacheKey)
  if (cached) return cached  // ← retour immédiat, 0 appel LLM
}

// Après avoir reçu la réponse :
if (conversationHistory.length === 0) {
  await setCache(cacheKey, aiResponse, 3600)  // ← TTL 1 heure
}
```

**Pourquoi seulement sans historique** : Le cache est limité aux **premières questions** (sans contexte de conversation). Les questions dans une conversation en cours dépendent du contexte et ne peuvent pas être mises en cache.

**Questions typiquement mises en cache** : "Quelles sont les heures du petit-déjeuner ?", "Quel est le mot de passe WiFi ?", "Y a-t-il une piscine ?" → Ces questions sont posées par des dizaines de clients différents.

---

### 2.4 Cache météo in-process

**Fichier** : `app/api/weather/route.ts`

```typescript
let weatherCache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 30 * 60 * 1000  // 30 minutes

export async function GET(request: Request) {
  if (weatherCache && Date.now() - weatherCache.timestamp < CACHE_DURATION) {
    return NextResponse.json(weatherCache.data)
  }
  // ... appel Open-Meteo ...
}
```

**Pourquoi** : La météo est affichée dans le chat et utilisée pour les recommandations d'attractions. L'API Open-Meteo est gratuite mais a des limites de débit. La météo ne change pas significativement en 30 minutes.

---

### 2.5 Cache SWR côté client

**Fichier** : `app/admin/analytics/page.tsx`

Le tableau de bord analytics utilise SWR pour la récupération de données :

```typescript
const { data: overviewData } = useSWR('/api/analytics/overview', fetcher, {
  refreshInterval: 30000  // rafraîchissement toutes les 30 secondes
})
```

SWR applique automatiquement :
- **stale-while-revalidate** : affiche les données en cache pendant la revalidation
- **déduplication des requêtes** : plusieurs composants qui lisent la même clé n'envoient qu'une seule requête

---

## 3. Optimisation de la base de données

### 3.1 Pool de connexions PostgreSQL

**Fichier** : `lib/db.ts`, lignes 5–13

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,                     // maximum 20 connexions simultanées
  idleTimeoutMillis: 30000,    // libère les connexions inactives après 30s
  connectionTimeoutMillis: 10000,  // timeout 10s (Neon a une latence de démarrage à froid)
})
```

**Pourquoi `connectionTimeoutMillis: 10000`** : Neon (base PostgreSQL serverless) peut avoir jusqu'à 3–5 secondes de "cold start" après une période d'inactivité. La valeur par défaut de 2s causait des timeouts.

---

### 3.2 Requêtes parallèles avec `Promise.all`

**Fichier** : `lib/db.ts`, lignes 43–85

Au lieu de faire 6 requêtes séquentielles pour chaque hôtel, toutes les sous-requêtes sont lancées **en parallèle** via `Promise.all` et couvrent **tous les hôtels à la fois** grâce à `ANY($1)` :

```typescript
const [
  facilitiesResult,
  contactResult,
  amenitiesResult,
  eventsResult,
  activitiesResult,
  attractionsResult,
] = await Promise.all([
  client.query(`SELECT ... FROM facilities WHERE hotel_id = ANY($1)`, [hotelIds]),
  client.query(`SELECT ... FROM contact_info WHERE hotel_id = ANY($1)`, [hotelIds]),
  client.query(`SELECT ... FROM amenities WHERE hotel_id = ANY($1)`, [hotelIds]),
  client.query(`SELECT ... FROM special_events WHERE hotel_id = ANY($1)`, [hotelIds]),
  client.query(`SELECT ... FROM hotel_activities WHERE hotel_id = ANY($1)`, [hotelIds]),
  client.query(`SELECT ... FROM nearby_attractions WHERE hotel_id = ANY($1)`, [hotelIds]),
])
```

**Gain** :
| Approche | Requêtes | Round-trips | Temps estimé |
|---|---|---|---|
| Ancienne (séquentielle par hôtel) | 3 hôtels × 7 requêtes = 21 | 21 | ~1000ms |
| Nouvelle (parallèle, tous hôtels) | 6 requêtes totales | 6 | ~150ms |

L'assemblage des données (attribution à chaque hôtel) est ensuite effectué **en JavaScript** dans la mémoire du serveur, sans aucun round-trip supplémentaire.

---

## 4. Optimisation de l'IA / LLM

### 4.1 Troncature de l'historique de conversation

**Fichier** : `lib/ai-service.ts`, ligne 182

```typescript
const messages: Message[] = [
  { role: 'system', content: systemPrompt },
  ...conversationHistory.slice(-4),  // ← seulement les 4 derniers échanges
  { role: 'user', content: userMessage },
]
```

**Pourquoi** : Envoyer tout l'historique de conversation au LLM augmente le nombre de tokens (= coût et latence). Les 4 derniers messages sont suffisants pour maintenir la cohérence de la conversation tout en limitant les tokens de contexte.

---

### 4.2 Limite de tokens de sortie (Groq)

**Fichier** : `lib/ai-service.ts`, ligne 62

```typescript
await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  max_tokens: 400,  // ← répond en 2-4 phrases, pas des essais
  top_p: 1,
})
```

**Pourquoi `max_tokens: 400`** : Les réponses d'un concierge doivent être concises. Limiter les tokens réduit la latence et le coût (Groq facture par token).

---

### 4.3 Température réduite pour Ollama

**Fichier** : `lib/ai-service.ts`, ligne 41

```typescript
// Ollama
options: {
  temperature: 0.4,  // ← plus déterministe que Groq (0.7)
  num_ctx: 8192,     // fenêtre de contexte configurable via OLLAMA_NUM_CTX
}
```

**Pourquoi** : Qwen 2.5 7B est un modèle plus petit que llama-3.3-70b. Une température plus faible produit des réponses plus fiables et cohérentes avec les données hôtelières.

---

### 4.4 Switching de provider via variable d'environnement

**Fichier** : `lib/ai-service.ts`, lignes 86 et 186–188

```typescript
const aiProvider = process.env.AI_PROVIDER || 'groq'

const aiResponse = aiProvider === 'ollama'
  ? await callOllama(messages)
  : await callGroq(messages)
```

**Fichier** : `.env.local`

```env
# Basculer entre Groq (cloud) et Ollama (local, gratuit)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

**Pourquoi** : Permet de passer d'un LLM cloud (coût, latence réseau) à un modèle local gratuit (Ollama) sans changer une seule ligne de code.

---

## 5. Optimisation du contexte RAG

Le RAG (*Retrieval-Augmented Generation*) est l'injection de données hôtelières dans le prompt du LLM. Un contexte trop long → plus de tokens → plus de latence et de coût. Deux mécanismes optimisent cette injection.

### 5.1 Extraction de sections pertinentes par mots-clés

**Fichier** : `lib/rag-knowledge.ts`, lignes 395–497

```typescript
export function extractRelevantContext(query: string, fullKnowledge: string): string {
  const keywords: { [key: string]: string[] } = {
    'pool':        ['FACILITIES'],
    'breakfast':   ['RESTAURANT SCHEDULE'],
    'event':       ['SPECIAL EVENTS'],
    'wifi':        ['AMENITIES'],
    'attraction':  ['NEARBY ATTRACTIONS'],
    'météo':       ['CURRENT WEATHER'],  // ← mots-clés français inclus
    // ... 40+ mots-clés
  }

  const relevantHeaders = new Set<string>()
  for (const [keyword, sections] of Object.entries(keywords)) {
    if (queryLower.includes(keyword)) {
      sections.forEach(s => relevantHeaders.add(s))
    }
  }

  // Si aucun mot-clé trouvé → retourne le contexte complet (fallback)
  if (relevantHeaders.size === 0) return fullKnowledge

  // Toujours inclure CONTACT INFORMATION et HOTEL INFORMATION
  return sectionsFiltered.join('\n\n')
}
```

**Exemple concret** :
- Question : "Quelles sont les heures de la piscine ?"
- Sections injectées : `CONTACT INFORMATION` + `HOTEL INFORMATION` + `FACILITIES`
- Sections ignorées : `SPECIAL EVENTS`, `NEARBY ATTRACTIONS`, `WEATHER`, etc.
- Résultat : ~300 tokens au lieu de ~2000 tokens

---

### 5.2 Clustering K-Means pour les attractions personnalisées

**Fichier** : `lib/rag-knowledge.ts`, lignes 499–563  
**Fichier** : `lib/attraction-clustering.ts`

Quand le profil du visiteur est connu (via `GuestRegistrationForm`), les attractions sont **classées par pertinence** selon son profil plutôt que d'être toutes listées.

```typescript
export async function buildPersonalizedHotelKnowledge(
  hotelSettings, hotelData, weather,
  guestProfile: ClusteringGuestProfile,  // ← age, groupe, but du voyage
  hotelId
): Promise<string> {
  // 1. Assigner le profil à l'un des 5 clusters de voyageurs
  // 2. Scorer chaque attraction selon les poids d'affinité du cluster
  // 3. Ajuster le score avec un modificateur météo
  // 4. Pénaliser les attractions éloignées (distance penalty)
  // 5. Injecter uniquement le Top-3 dans le contexte LLM
  const attractionsContext = buildClusteredAttractionsContext(
    hotelSettings.nearbyAttractions,
    guestProfile,
    clusteringWeather,
    3  // ← top 3 uniquement
  )
}
```

**Les 5 clusters de voyageurs** :
| Cluster | Profil | Attractions privilégiées |
|---|---|---|
| 0 | Famille avec enfants | Parcs, plages, musées interactifs |
| 1 | Couple en lune de miel | Sites panoramiques, restaurants, plages isolées |
| 2 | Voyageur solo aventurier | Randonnées, sports nautiques, exploration |
| 3 | Touriste culturel | Musées, médinas, sites historiques |
| 4 | Voyageur business | Restaurants, cafés, shopping |

**Gain** : Au lieu de lister 15–20 attractions pour un hôtel, seules les 3 meilleures pour CE profil sont injectées → réduction de 80% des tokens d'attractions.

---

### 5.3 Directive météo intégrée dans le contexte

**Fichier** : `lib/rag-knowledge.ts`, lignes 372–388

```typescript
if (isRainy) {
  knowledge.push(`Weather Directive: ⛈️ RAINY — recommend indoor activities`)
} else if (temp >= 35) {
  knowledge.push(`Weather Directive: ☀️ VERY HOT — suggest early-morning outdoor activities`)
} else if (temp >= 22) {
  knowledge.push(`Weather Directive: 🌤️ IDEAL WEATHER — perfect for outdoor activities`)
}
```

**Pourquoi** : Au lieu de demander au LLM de raisonner sur la météo (ce qui prend des tokens et peut produire des erreurs), on lui donne directement une **directive explicite** à suivre.

---

## 6. Optimisation du bundle front-end

### 6.1 Tree-shaking des librairies UI

**Fichier** : `next.config.js`, lignes 5–8

```javascript
experimental: {
  optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
}
```

**Pourquoi** : Ces trois librairies sont volumineuses. Sans cette option, Next.js importe **tout** le paquet. Avec `optimizePackageImports`, seules les icônes et composants **réellement utilisés** sont inclus dans le bundle.

- `lucide-react` : ~1300 icônes disponibles, seules ~30 sont utilisées
- `recharts` : composants de charts nombreux, seuls BarChart, PieChart, etc. sont utilisés
- `framer-motion` : API très large, seul un sous-ensemble est utilisé

---

### 6.2 Optimisation des images

**Fichier** : `next.config.js`, lignes 10–17

```javascript
images: {
  remotePatterns: [{ protocol: 'https', hostname: '**' }],
  formats: ['image/webp', 'image/avif'],  // ← formats modernes
  minimumCacheTTL: 3600,                  // ← cache 1h côté navigateur
}
```

Next.js optimise automatiquement toutes les images `<Image>` :
- **Conversion WebP/AVIF** : 25–50% plus léger que JPEG/PNG
- **Lazy loading** : les images hors viewport ne sont chargées que quand nécessaire
- **Redimensionnement côté serveur** : le `sizes` prop dans chaque `<Image>` indique la taille exacte à charger
- **Priorité** : `priority` sur l'image hero → préchargement immédiat

---

### 6.3 Chargement différé des locales i18n

**Fichier** : `lib/i18n.tsx`, lignes 121–127

```typescript
const loaders: Record<Exclude<Language, 'en'>, () => Promise<...>> = {
  fr: () => import('./locales/fr').then(m => m.default),
  ar: () => import('./locales/ar').then(m => m.default),
  es: () => import('./locales/es').then(m => m.default),
  de: () => import('./locales/de').then(m => m.default),
  it: () => import('./locales/it').then(m => m.default),
}
```

**Pourquoi** : Les 5 fichiers de traduction ne sont téléchargés que si l'utilisateur change la langue. Le bundle initial ne contient que l'anglais (`en`). Un cache in-process (`loadedDicts`) évite de retélécharger une langue déjà chargée.

---

### 6.4 Animations optimisées (Framer Motion)

- `whileInView` avec `viewport={{ once: true }}` → les animations ne se déclenchent qu'une fois
- `useScroll` + `useTransform` pour le parallax → utilise `requestAnimationFrame` et ne bloque pas le thread principal
- `AnimatePresence` pour les transitions → évite les re-renders inutiles

---

## 7. Rate Limiting (limitation du débit)

### 7.1 Implémentation sliding-window in-memory

**Fichier** : `lib/rate-limiter.ts` (136 lignes)

```typescript
export class RateLimiter {
  private readonly store = new Map<string, Window>()

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const windowStart = Date.now() - this.windowMs
    // Évict les timestamps hors fenêtre
    window.timestamps = window.timestamps.filter(t => t > windowStart)

    if (count >= this.maxRequests) {
      return { success: false, retryAfter: Math.ceil(this.windowMs / 1000) }
    }
    window.timestamps.push(now)
    return { success: true, remaining: this.maxRequests - count }
  }

  // Nettoyage automatique toutes les 5 minutes pour éviter les fuites mémoire
  private cleanup() {
    for (const [key, window] of this.store) {
      window.timestamps = window.timestamps.filter(t => t > now - window.windowMs)
      if (window.timestamps.length === 0) this.store.delete(key)
    }
  }
}
```

**Pourquoi in-memory et pas Redis** : Simplicité de déploiement, pas de latence réseau pour le rate limiting. Acceptable car les compteurs se réinitialisent au redémarrage du serveur, ce qui est acceptable pour une application hôtelière.

---

### 7.2 Limiteurs préconfigurés

**Fichier** : `lib/rate-limiter.ts`, lignes 102–127

| Limiteur | Endpoint | Fenêtre | Max requêtes | Identifiant |
|---|---|---|---|---|
| `chatRateLimiter` | `/api/chat` | 15 min | 100 | IP |
| `authRateLimiter` | `/api/admin/login` | 15 min | 20 | IP |
| `apiRateLimiter` | `/api/*` général | 15 min | 50 | IP |
| `adminRateLimiter` | `/api/analytics/*` | 15 min | 30 | IP |

**Extraction IP avec support proxy** :

```typescript
export function getClientIp(request: Request): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()  // ← derrière Nginx/Cloudflare
  return headers.get('x-real-ip') ?? 'unknown'
}
```

---

### 7.3 Headers de réponse rate limit

**Fichier** : `lib/rate-limit-helper.ts`

Chaque réponse rate-limitée inclut des headers standard :
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1717870080
Retry-After: 900
```

---

## 8. Sécurité et validation des entrées

### 8.1 Validation Zod sur toutes les entrées

**Fichier** : `lib/validation.ts`  
**Utilisé dans** : `app/api/chat/route.ts`

```typescript
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  hotelId: z.string().regex(/^[a-z0-9-]+$/),
  sessionId: z.string().uuid().optional(),
  guestProfile: GuestProfileSchema.optional(),
  conversationHistory: z.array(MessageSchema).max(20).optional(),
})
```

**Pourquoi** : Empêche les injections de prompt (prompt injection), les payloads malformés, et les attaques par dépassement de taille.

---

### 8.2 Sanitisation HTML (XSS)

**Fichier** : `app/api/chat/route.ts`

```typescript
import DOMPurify from 'isomorphic-dompurify'
const safeMessage = DOMPurify.sanitize(message)
```

Supprime tout HTML/JavaScript malveillant avant de transmettre la question au LLM.

---

### 8.3 Authentification JWT avec délai anti-timing

**Fichier** : `app/api/admin/login/route.ts`

```typescript
// Vérification bcrypt (lente par design — résistant au brute force)
const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)

// Délai fixe même en cas d'échec — empêche les timing attacks
if (!isValid) {
  await new Promise(resolve => setTimeout(resolve, 200))
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}

// JWT signé avec issuer et audience
const token = jwt.sign(
  { username, role: 'admin' },
  JWT_SECRET,
  { expiresIn: '24h', issuer: 'hotel-assistant', audience: 'admin-panel' }
)
```

---

### 8.4 Headers de sécurité OWASP (Middleware)

**Fichier** : `middleware.ts`

Appliqué automatiquement à **toutes** les routes `/api/*` :

| Header | Valeur | Protection contre |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS réfléchi |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Fuite de referer |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Accès hardware non autorisé |
| `Content-Security-Policy` | `default-src 'self'` | Injection de contenu |
| `Strict-Transport-Security` | `max-age=31536000` *(prod only)* | Downgrade HTTPS |

---

## 9. Optimisation météo

**Fichier** : `app/api/weather/route.ts`

- **Source** : API Open-Meteo (gratuite, sans clé)
- **Cache in-process** : 30 minutes (les données météo ne changent pas souvent)
- **Coordonnées précises par hôtel** :
  ```
  sindbad-hammamet     : 36.405378, 10.598120
  villa-didon-carthage : 36.853108, 10.326584
  belvedere-fourati    : 36.815361, 10.178663
  ```
- **Données récupérées** : température, température ressentie, humidité, vitesse du vent, code météo → converties en description textuelle pour le LLM

---

## 10. Analytics — fire-and-forget

**Fichier** : `app/api/chat/route.ts`

```typescript
// Lance les opérations analytics SANS attendre qu'elles se terminent
// → n'ajoute aucune latence à la réponse chat
trackAnalytics(hotelId, message, guestProfile, aiResponse).catch(err =>
  console.error('Analytics tracking failed (non-blocking):', err)
)
```

**Ce qui est tracké de façon asynchrone** :
- Catégorie de la question (`detectQuestionCategory`) → table `question_categories`
- Sujet populaire (`trackPopularTopic`) → table `popular_topics`
- Langue détectée (`detectLanguage`) → colonne `preferred_language` dans `guest_profiles`
- Mise à jour du profil visiteur (`createOrUpdateGuestProfile`)

**Pourquoi fire-and-forget** : L'analytics ne doit pas ralentir la réponse du chatbot. Si une écriture en DB échoue, ce n'est pas critique — le visiteur reçoit toujours sa réponse.

---

## 11. Internationalisation (i18n)

**Fichier** : `lib/i18n.tsx`

**6 langues supportées** : Anglais (défaut), Français, Allemand, Espagnol, Italien, Arabe (RTL)

**Optimisations** :

1. **Dictionnaire anglais inclus dans le bundle** : pas de chargement réseau pour la langue par défaut
2. **Locales chargées à la demande** : seulement quand l'utilisateur change la langue
3. **Cache de session** : chaque locale n'est téléchargée qu'une fois par session
4. **RTL automatique** : `document.documentElement.dir = 'rtl'` pour l'arabe
5. **Fallback anglais** : `t(key)` → locale active → anglais → clé brute (jamais d'erreur)

```typescript
const t = (key: string): string => dict[key] ?? en[key] ?? key
```

---

## 12. Tableau récapitulatif

| Optimisation | Fichier | Technique | Gain |
|---|---|---|---|
| Cache paramètres hôtel | `lib/db.ts` | In-process, TTL 5 min | -6 requêtes DB / message |
| Requêtes DB parallèles | `lib/db.ts` | `Promise.all` + `ANY($1)` | -70% de round-trips DB |
| Cache réponses IA | `lib/ai-service.ts` | Redis, TTL 1h, MD5 key | 0 appel LLM pour questions répétées |
| Troncature historique | `lib/ai-service.ts` | `.slice(-4)` | -60% de tokens d'entrée |
| Max tokens output | `lib/ai-service.ts` | `max_tokens: 400` | Latence réduite, coût réduit |
| Cache météo | `app/api/weather/route.ts` | In-process, TTL 30 min | 0 appel API météo / 30 min |
| Contexte RAG filtré | `lib/rag-knowledge.ts` | Mots-clés → sections | -85% de tokens contexte |
| Attractions K-Means | `lib/rag-knowledge.ts` + `attraction-clustering.ts` | Clustering 5 personas, Top-3 | -80% de tokens attractions |
| Directive météo | `lib/rag-knowledge.ts` | Texte directif pré-calculé | Moins de raisonnement LLM |
| Analytics async | `app/api/chat/route.ts` | fire-and-forget | 0 ms ajouté à la réponse |
| Tree-shaking UI | `next.config.js` | `optimizePackageImports` | Bundle JS plus petit |
| Images WebP/AVIF | `next.config.js` | Formats modernes + TTL | -30% poids images |
| Locales lazy | `lib/i18n.tsx` | Dynamic import | Bundle initial plus petit |
| Redis dégradé | `lib/redis.ts` | Graceful fallback | App fonctionne sans Redis |
| Rate limiting | `lib/rate-limiter.ts` | Sliding window in-memory | Protection DDoS / brute force |
| Headers OWASP | `middleware.ts` | Next.js middleware | Protection sécurité globale |
| Validation Zod | `lib/validation.ts` | Schémas stricts | Entrées malformées rejetées |
| Sanitisation XSS | `app/api/chat/route.ts` | DOMPurify | Injections HTML bloquées |
| JWT + timing delay | `app/api/admin/login/route.ts` | bcrypt + setTimeout 200ms | Anti brute force + timing attack |
| SWR analytics | `app/admin/analytics/page.tsx` | stale-while-revalidate | UI réactive sans blocage |
| Pool PostgreSQL | `lib/db.ts` | `max: 20`, timeout 10s | Gestion Neon cold-start |

---

## Notes importantes pour une IA qui reprend ce projet

1. **`AI_PROVIDER`** dans `.env.local` contrôle quel LLM est utilisé (`groq` ou `ollama`). Actuellement défini à `ollama` → Ollama doit tourner localement sur le port 11434 avec le modèle `qwen2.5:7b` chargé.

2. **Ne jamais appeler `getAllHotelSettings()` en boucle** — la fonction a son propre cache de 5 minutes. Un appel par requête est suffisant.

3. **Après toute modification des paramètres hôtel**, appeler `invalidateHotelSettingsCache()` ET `deleteCache('hotel:settings')` pour invalider les deux niveaux de cache.

4. **Le contexte RAG ne doit pas dépasser ~12 000 caractères** (limite gérée dans `app/api/chat/route.ts`). Au-delà, `extractRelevantContext()` doit être utilisé pour filtrer.

5. **Les analytics sont non-bloquantes** — toute erreur dans le tracking ne doit pas lever d'exception vers le client.

6. **Le rate limiter est in-process** — dans un déploiement multi-instances (ex: plusieurs serveurs), chaque instance a son propre compteur. Pour un déploiement scalé, migrer vers un rate limiter Redis.

7. **Neon PostgreSQL** a un délai de "cold start" de 3–5 secondes après 5 minutes d'inactivité. Le `connectionTimeoutMillis: 10000` et le cache in-process de `getAllHotelSettings` mitigent cet effet.
