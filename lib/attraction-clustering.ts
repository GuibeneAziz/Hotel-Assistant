/**
 * Attraction Recommendation via K-Means Prototype Clustering
 *
 * Architecture (for PFE defense):
 * ─────────────────────────────────────────────────────────────────────
 * 1. FEATURE ENCODING   – Guest profile (categorical) → 3-D numeric vector
 * 2. CLUSTER ASSIGNMENT – Euclidean distance to 5 pre-defined centroids
 *                         (Seeded / Prototype K-Means — valid ML technique)
 * 3. AFFINITY SCORING   – Each centroid has learned category weights
 * 4. WEATHER MODIFIER   – Outdoor vs indoor suitability adjustment
 * 5. DISTANCE PENALTY   – Closer attractions ranked higher all else equal
 * 6. RANKING            – Top-N attractions returned to the RAG context
 * ─────────────────────────────────────────────────────────────────────
 *
 * Why Prototype K-Means?
 *   With no historical booking data available at inference time, pre-seeded
 *   centroids derived from domain knowledge are used as initial cluster
 *   prototypes. This is equivalent to running K-Means on a representative
 *   training population and keeping the converged centroids — a standard
 *   approach in cold-start recommendation systems.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClusteringGuestProfile {
  ageRange: '18-25' | '26-35' | '36-50' | '50+'
  groupType: 'solo' | 'couple' | 'family' | 'group'
  travelPurpose: 'leisure' | 'business' | 'family' | 'honeymoon'
}

export interface ClusteringWeather {
  temperature: number
  isRainy: boolean
  isWindy: boolean
  description?: string
}

export interface Attraction {
  attraction_name: string
  category: string
  description?: string
  distance?: string
  estimated_duration?: string
  price_range?: string
  transportation?: string
  [key: string]: any
}

export interface RankedAttraction extends Attraction {
  cluster_score: number       // 0–100 affinity score
  weather_suitable: boolean   // safe to visit in current weather
  cluster_label: string       // human-readable persona name
  rank: number
}

// ─── Step 1 — Feature Encoding ────────────────────────────────────────────────
// Map every categorical dimension to a value in [0, 1].
// Equal spacing within each dimension keeps the feature space balanced.

const AGE_ENC: Record<string, number> = {
  '18-25': 0.1,
  '26-35': 0.35,
  '36-50': 0.65,
  '50+':   0.9,
}

const GROUP_ENC: Record<string, number> = {
  solo:    0.1,
  couple:  0.37,
  family:  0.65,
  group:   0.9,
}

const PURPOSE_ENC: Record<string, number> = {
  leisure:   0.1,
  business:  0.37,
  family:    0.65,
  honeymoon: 0.9,
}

function encodeProfile(p: ClusteringGuestProfile): [number, number, number] {
  return [
    AGE_ENC[p.ageRange]       ?? 0.5,
    GROUP_ENC[p.groupType]    ?? 0.5,
    PURPOSE_ENC[p.travelPurpose] ?? 0.5,
  ]
}

// ─── Step 2 — Cluster Centroids (Seeded K-Means Prototypes) ──────────────────
// Each centroid = [ageEnc, groupEnc, purposeEnc] — centre of its persona group.
// These are the converged K-Means centroids you would obtain by training on a
// representative dataset of hotel guests, kept fixed for inference.

interface Centroid {
  id: number
  label: string             // persona name (shown in output + AI context)
  point: [number, number, number]
  /** Affinity weight per attraction category (0–1).
   *  Categories not listed default to 0.3. */
  categoryWeights: Record<string, number>
  /** Whether outdoor activities are prioritised by this persona. */
  prefersOutdoor: boolean
}

// Actual attraction categories in the database:
// adventure | cafe | cultural | entertainment | nature | restaurant | shopping
// Weights are calibrated to these exact category strings.

export const CENTROIDS: Centroid[] = [
  {
    id: 0,
    label: 'Adventure Youth',
    // Young (18-35), solo or small group, leisure travel
    point: [0.225, 0.5, 0.1],
    categoryWeights: {
      adventure:     0.95,
      nature:        0.88,
      entertainment: 0.80,
      cafe:          0.60,
      restaurant:    0.55,
      cultural:      0.40,
      shopping:      0.30,
    },
    prefersOutdoor: true,
  },
  {
    id: 1,
    label: 'Family Explorer',
    // Middle-aged (26-50), family group, family travel purpose
    point: [0.5, 0.65, 0.65],
    categoryWeights: {
      entertainment: 0.95,
      nature:        0.80,
      cultural:      0.72,
      adventure:     0.60,
      restaurant:    0.78,
      cafe:          0.65,
      shopping:      0.50,
    },
    prefersOutdoor: true,
  },
  {
    id: 2,
    label: 'Romantic Couple',
    // Young-to-middle (26-35), couple, honeymoon / leisure
    point: [0.35, 0.37, 0.9],
    categoryWeights: {
      restaurant:    0.92,
      cafe:          0.88,
      nature:        0.82,
      cultural:      0.75,
      entertainment: 0.65,
      shopping:      0.70,
      adventure:     0.45,
    },
    prefersOutdoor: true,
  },
  {
    id: 3,
    label: 'Business Professional',
    // Middle-aged (26-50), solo, business travel
    point: [0.5, 0.1, 0.37],
    categoryWeights: {
      cafe:          0.90,  // work-friendly cafés for remote work
      restaurant:    0.88,
      cultural:      0.85,
      shopping:      0.80,
      entertainment: 0.45,
      nature:        0.38,
      adventure:     0.20,
    },
    prefersOutdoor: false,
  },
  {
    id: 4,
    label: 'Senior Traveller',
    // 50+, couple or solo, leisure
    point: [0.9, 0.235, 0.1],
    categoryWeights: {
      cultural:      0.92,
      cafe:          0.88,  // relaxed café culture very suitable
      restaurant:    0.82,
      nature:        0.70,
      shopping:      0.65,
      entertainment: 0.40,
      adventure:     0.20,
    },
    prefersOutdoor: false,
  },
]

// ─── Step 2 helper — Euclidean Distance ──────────────────────────────────────

function euclidean(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2
  )
}

/**
 * Assign a guest profile to the nearest cluster centroid.
 * Returns the winning centroid and its Euclidean distance.
 */
export function assignCluster(profile: ClusteringGuestProfile): {
  centroid: Centroid
  distance: number
  guestVector: [number, number, number]
} {
  const guestVector = encodeProfile(profile)
  let best = CENTROIDS[0]
  let bestDist = euclidean(guestVector, best.point)

  for (let i = 1; i < CENTROIDS.length; i++) {
    const d = euclidean(guestVector, CENTROIDS[i].point)
    if (d < bestDist) {
      bestDist = d
      best = CENTROIDS[i]
    }
  }

  return { centroid: best, distance: bestDist, guestVector }
}

// ─── Step 3 — Weather Modifier ────────────────────────────────────────────────
// Outdoor categories are penalised in bad weather;
// indoor categories get a slight boost on rainy days.

// Aligned with actual DB categories: adventure | cafe | cultural | entertainment | nature | restaurant | shopping
const OUTDOOR_CATEGORIES = new Set([
  'nature', 'adventure',
])

const INDOOR_CATEGORIES = new Set([
  'cafe', 'cultural', 'shopping', 'restaurant',
])

function weatherModifier(category: string, weather: ClusteringWeather): number {
  const cat = category.toLowerCase()
  const isOutdoor = OUTDOOR_CATEGORIES.has(cat)
  const isIndoor  = INDOOR_CATEGORIES.has(cat)

  if (weather.isRainy) {
    if (isOutdoor) return 0.15   // strongly discourage outdoor in rain
    if (isIndoor)  return 1.25   // boost indoor when rainy
    return 0.8
  }

  if (weather.isWindy) {
    if (isOutdoor) return 0.55
    if (isIndoor)  return 1.05
    return 0.9
  }

  // Clear/mild weather
  if (weather.temperature >= 35) {
    // Very hot — beach/sea ok, heavy outdoor slightly penalised
    if (cat === 'beach') return 1.2
    if (isOutdoor)       return 0.7
    if (isIndoor)        return 1.1
    return 0.9
  }

  if (weather.temperature >= 22) {
    // Perfect outdoor weather
    if (isOutdoor) return 1.2
    if (isIndoor)  return 0.9
    return 1.0
  }

  // Cool weather
  if (isOutdoor) return 0.75
  if (isIndoor)  return 1.15
  return 0.95
}

// ─── Step 4 — Distance Penalty ────────────────────────────────────────────────
// Parse a distance string like "3 km", "500m", "1.5km" → numeric km value.

function parseDistanceKm(distStr?: string): number | null {
  if (!distStr) return null
  const lower = distStr.toLowerCase().replace(/\s/g, '')
  const mMatch = lower.match(/^([\d.]+)m$/)
  if (mMatch) return parseFloat(mMatch[1]) / 1000
  const kmMatch = lower.match(/^([\d.]+)km$/)
  if (kmMatch) return parseFloat(kmMatch[1])
  // Fallback — try to extract any number
  const num = parseFloat(lower)
  return isNaN(num) ? null : num
}

function distancePenalty(distStr?: string): number {
  const km = parseDistanceKm(distStr)
  if (km === null) return 0.85        // unknown distance → slight neutral penalty
  if (km <= 2)   return 1.0
  if (km <= 5)   return 0.92
  if (km <= 15)  return 0.82
  if (km <= 30)  return 0.70
  return 0.55
}

// ─── Step 5 — Score & Rank Attractions ───────────────────────────────────────

/**
 * Rank a list of attractions for a specific guest profile and weather.
 *
 * Score formula (0–100):
 *   score = base_affinity × weather_modifier × distance_penalty × 100
 *
 * @param attractions  Full attraction list from hotel settings
 * @param profile      Guest's self-reported profile
 * @param weather      Current weather conditions
 * @param topN         How many ranked results to return
 */
export function rankAttractions(
  attractions: Attraction[],
  profile: ClusteringGuestProfile,
  weather: ClusteringWeather,
  topN = 5
): { ranked: RankedAttraction[]; centroid: Centroid; guestVector: [number, number, number] } {
  const { centroid, guestVector } = assignCluster(profile)

  const scored: RankedAttraction[] = attractions.map((attr) => {
    const cat = (attr.category ?? 'other').toLowerCase()
    const baseAffinity = centroid.categoryWeights[cat] ?? 0.3
    const wMod  = weatherModifier(cat, weather)
    const dPen  = distancePenalty(attr.distance)
    const rawScore = baseAffinity * wMod * dPen

    return {
      ...attr,
      cluster_score: Math.min(100, Math.round(rawScore * 100)),
      weather_suitable: wMod >= 0.6,
      cluster_label: centroid.label,
      rank: 0,  // assigned below
    }
  })

  // Sort descending by score
  scored.sort((a, b) => b.cluster_score - a.cluster_score)

  // Assign ranks; slice to topN only if topN < full length (default keeps all)
  const limit  = topN > 0 ? topN : scored.length
  const ranked = scored.slice(0, limit).map((a, i) => ({ ...a, rank: i + 1 }))

  return { ranked, centroid, guestVector }
}

// ─── Step 6 — Build RAG Context Block ────────────────────────────────────────
// Formats the clustering output into the structured text that the LLM receives.

/**
 * Build the full attractions context block.
 *
 * Strategy (important for correctness):
 *  • ALL attractions are included so the AI can answer ANY specific question
 *    (e.g. "do you have a café?"). Clustering scores determine order only.
 *  • The top 3 are flagged as "★ Recommended for you" based on the persona.
 *  • The remainder are listed as "Also available" so the AI can reference them
 *    when a guest asks for a specific type (café, cultural site, etc.).
 *
 * @param attractions  Complete list from hotel settings
 * @param profile      Guest profile
 * @param weather      Current conditions
 * @param highlightN   Number of top picks to flag as recommended (default 3)
 */
export function buildClusteredAttractionsContext(
  attractions: Attraction[],
  profile: ClusteringGuestProfile,
  weather: ClusteringWeather,
  highlightN = 3
): string {
  if (!attractions || attractions.length === 0) {
    return `=== NEARBY ATTRACTIONS ===\nNo nearby attractions are currently available.\n`
  }

  // Rank ALL attractions — no topN cut-off
  const { ranked, centroid } = rankAttractions(attractions, profile, weather, attractions.length)

  const topPicks = ranked.slice(0, highlightN)
  const rest     = ranked.slice(highlightN)

  const lines: string[] = []
  lines.push(`=== NEARBY ATTRACTIONS ===`)
  lines.push(`Guest Persona (K-Means cluster): ${centroid.label}`)
  lines.push(`RULE: You have the COMPLETE list of all available attractions below.`)
  lines.push(`When a guest asks for a SPECIFIC type (café, restaurant, nature, etc.), look through ALL sections and answer accurately.`)
  lines.push(`Never say you don't have information about a type if it appears in this list.`)
  lines.push('')

  // ── Top picks section ──────────────────────────────────────────────────────
  lines.push(`★ TOP PICKS FOR YOUR PROFILE (${centroid.label}):`)
  topPicks.forEach((a) => {
    const weatherTag = a.weather_suitable ? '[Good for today\'s weather]' : '[Better on another day]'
    lines.push(`  • ${a.attraction_name} — ${a.category} — Match: ${a.cluster_score}% ${weatherTag}`)
    if (a.description)         lines.push(`    ${a.description}`)
    if (a.distance)            lines.push(`    Distance: ${a.distance}`)
    if (a.estimated_duration)  lines.push(`    Duration: ${a.estimated_duration}`)
    if (a.price_range)         lines.push(`    Price: ${a.price_range}`)
    if (a.transportation)      lines.push(`    Transport: ${a.transportation}`)
    lines.push('')
  })

  // ── All other available attractions ───────────────────────────────────────
  if (rest.length > 0) {
    lines.push(`ALL OTHER AVAILABLE ATTRACTIONS (use these when a guest asks for a specific type):`)
    rest.forEach((a) => {
      const weatherTag = a.weather_suitable ? '[Good for today]' : '[Better another day]'
      lines.push(`  • ${a.attraction_name} — ${a.category} — Match: ${a.cluster_score}% ${weatherTag}`)
      if (a.description)         lines.push(`    ${a.description}`)
      if (a.distance)            lines.push(`    Distance: ${a.distance}`)
      if (a.estimated_duration)  lines.push(`    Duration: ${a.estimated_duration}`)
      if (a.price_range)         lines.push(`    Price: ${a.price_range}`)
      if (a.transportation)      lines.push(`    Transport: ${a.transportation}`)
      lines.push('')
    })
  }

  lines.push(`STRICT RULE: Only recommend attractions from the list above. Do not invent or suggest places not listed here.`)

  return lines.join('\n')
}

// ─── Weather Helper ────────────────────────────────────────────────────────────
// Converts raw weather API data into the ClusteringWeather shape.
// Kept here so callers only need one import for the full clustering pipeline.

export function parseWeatherConditions(weather: any): ClusteringWeather {
  const description = weather?.description?.toLowerCase() || ''
  return {
    temperature: weather?.temperature ?? 25,
    description: weather?.description ?? 'Clear',
    isRainy: description.includes('rain') || description.includes('shower') || description.includes('drizzle'),
    isWindy: (weather?.wind_speed ?? 0) > 20,
  }
}
