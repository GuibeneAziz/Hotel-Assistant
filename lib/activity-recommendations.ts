import {
  rankAttractions,
  type Attraction,
  type ClusteringGuestProfile,
  type ClusteringWeather,
} from './attraction-clustering'

type HistoryEntry = { role: string; content: string }

const CAFE_KEYWORDS = [
  'coffee', 'cafe', 'café', 'espresso', 'latte', 'cappuccino', 'flat white',
  'mint tea', 'thé', 'tea house', 'cafeteria',
]
const ADVENTURE_KEYWORDS = [
  'adventur', 'active', 'thrill', 'exciting', 'sport', 'sports', 'quad',
  'jet ski', 'kayak', 'hike', 'hiking', 'extreme',
]
const CULTURAL_KEYWORDS = [
  'museum', 'cultural', 'culture', 'historic', 'history', 'heritage', 'ruins',
  'medina', 'archaeolog', 'monument',
]
const NATURE_KEYWORDS = [
  'beach', 'nature', 'outdoor', 'park', 'sea', 'coast', 'garden', 'scenic', 'sunset',
]
const SHOPPING_KEYWORDS = ['shop', 'shopping', 'market', 'souk', 'boutique']
const RESTAURANT_KEYWORDS = ['restaurant', 'food', 'eat', 'lunch', 'dinner', 'meal', 'dining']
const ENTERTAINMENT_KEYWORDS = ['entertainment', 'fun', 'theme park', 'golf', 'marina', 'festival']

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function queryMatchesAny(query: string, keywords: string[]): boolean {
  return keywords.some((keyword) => query.includes(keyword))
}

export function isStep1PreferenceQuestion(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('are you looking for') ||
    lower.includes('do you prefer') ||
    lower.includes('are the kids more into') ||
    lower.includes('would you prefer') ||
    lower.includes('shape your own adventure') ||
    lower.includes("i'd love to find the perfect spot") ||
    lower.includes('i would love to find the perfect spot') ||
    lower.includes('i would love to help you explore') ||
    lower.includes("i'd love to help you explore")
  )
}

export function isAnsweringStep1Preference(history: HistoryEntry[]): boolean {
  const lastAssistant = [...(history || [])]
    .reverse()
    .find((entry) => entry.role === 'assistant')
  return Boolean(lastAssistant && isStep1PreferenceQuestion(lastAssistant.content))
}

export function mapPreferenceToCategories(query: string): string[] {
  const q = normalizeQuery(query)
  if (queryMatchesAny(q, ADVENTURE_KEYWORDS)) return ['adventure', 'entertainment']
  if (queryMatchesAny(q, CAFE_KEYWORDS)) return ['cafe']
  if (queryMatchesAny(q, CULTURAL_KEYWORDS)) return ['cultural']
  if (queryMatchesAny(q, NATURE_KEYWORDS)) return ['nature']
  if (queryMatchesAny(q, SHOPPING_KEYWORDS)) return ['shopping']
  if (queryMatchesAny(q, RESTAURANT_KEYWORDS)) return ['restaurant']
  if (queryMatchesAny(q, ENTERTAINMENT_KEYWORDS)) return ['entertainment']
  if (queryMatchesAny(q, ['romantic', 'relax', 'chill', 'lively', 'social'])) {
    return ['nature', 'cultural', 'cafe']
  }
  return ['adventure', 'nature', 'cultural']
}

export function detectCategoryIntent(query: string): string[] {
  const q = normalizeQuery(query)
  const categories: string[] = []
  if (queryMatchesAny(q, CAFE_KEYWORDS)) categories.push('cafe')
  if (queryMatchesAny(q, ADVENTURE_KEYWORDS)) categories.push('adventure', 'entertainment')
  if (queryMatchesAny(q, CULTURAL_KEYWORDS)) categories.push('cultural')
  if (queryMatchesAny(q, NATURE_KEYWORDS)) categories.push('nature')
  if (queryMatchesAny(q, SHOPPING_KEYWORDS)) categories.push('shopping')
  if (queryMatchesAny(q, RESTAURANT_KEYWORDS)) categories.push('restaurant')
  return Array.from(new Set(categories))
}

export function shouldSkipActivityStep1(message: string, history: HistoryEntry[]): boolean {
  if (detectCategoryIntent(message).length > 0) return true
  if (isAnsweringStep1Preference(history)) return true

  const firstExploration = (history || []).find(
    (entry) => entry.role === 'user' && detectCategoryIntent(entry.content).length > 0
  )
  return Boolean(firstExploration)
}

export function resolveExplorationCategories(
  message: string,
  history: HistoryEntry[]
): string[] {
  const direct = detectCategoryIntent(message)
  if (direct.length > 0) return direct
  if (isAnsweringStep1Preference(history)) return mapPreferenceToCategories(message)
  return []
}

function toClusteringProfile(guestProfile?: any): ClusteringGuestProfile {
  return {
    ageRange: guestProfile?.age_range || guestProfile?.ageRange || '36-50',
    groupType: guestProfile?.group_type || guestProfile?.groupType || 'couple',
    travelPurpose: guestProfile?.travel_purpose || guestProfile?.travelPurpose || 'leisure',
  }
}

function toClusteringWeather(weather?: any): ClusteringWeather {
  return {
    temperature: weather?.temperature ?? 25,
    isRainy: Boolean(weather?.isRainy ?? weather?.description?.toLowerCase().includes('rain')),
    isWindy: Boolean(weather?.isWindy),
    description: weather?.description,
  }
}

function shortDescription(text?: string, max = 140): string {
  if (!text) return 'A nearby highlight worth visiting.'
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`
}

function categoryIntro(categories: string[]): string {
  if (categories.includes('cafe')) {
    return 'Here are some great coffee and café spots nearby:'
  }
  if (categories.includes('adventure')) {
    return 'Here are some active and adventurous options nearby:'
  }
  if (categories.includes('cultural')) {
    return 'Here are some cultural highlights nearby:'
  }
  if (categories.includes('nature')) {
    return 'Here are some outdoor and nature spots nearby:'
  }
  if (categories.includes('restaurant')) {
    return 'Here are some great restaurants nearby:'
  }
  if (categories.includes('shopping')) {
    return 'Here are some shopping spots nearby:'
  }
  if (categories.includes('entertainment')) {
    return 'Here are some fun entertainment options nearby:'
  }
  return 'Here are a few nearby options worth exploring:'
}

export function buildAttractionRecommendationResponse(
  categories: string[],
  attractions: Attraction[],
  guestProfile?: any,
  weather?: any
): string | null {
  const normalizedCategories = categories.map((c) => c.toLowerCase())
  const pool =
    normalizedCategories.length > 0
      ? attractions.filter((a) => normalizedCategories.includes((a.category || '').toLowerCase()))
      : attractions

  if (pool.length === 0) return null

  const { ranked } = rankAttractions(
    pool,
    toClusteringProfile(guestProfile),
    toClusteringWeather(weather),
    3
  )
  const picks = ranked.slice(0, 3)
  if (picks.length === 0) return null

  const list = picks
    .map((a) => `• **${a.attraction_name}** — ${shortDescription(a.description)}`)
    .join('\n')

  return `${categoryIntro(normalizedCategories)}\n\n${list}\n\nWhich one would you like to know more about?`
}

export function buildAttractionDetailResponse(attraction: Attraction, weather?: any): string {
  const lines = [
    `Here are the details for **${attraction.attraction_name}**:`,
    attraction.description,
    attraction.distance ? `Distance from the hotel: ${attraction.distance}.` : null,
    attraction.estimated_duration ? `Estimated duration: ${attraction.estimated_duration}.` : null,
    attraction.price_range ? `Price range: ${attraction.price_range}.` : null,
    attraction.transportation ? `Recommended transport: ${attraction.transportation}.` : null,
    weather?.description ? `Current weather: ${weather.description}.` : null,
  ].filter(Boolean)

  return lines.join('\n')
}

export function resolveAttractionDetailTarget(
  message: string,
  attractions: Attraction[],
  history: HistoryEntry[]
): Attraction | null {
  const vague = history.length > 0 ? resolveVagueChoiceFromHistory(message, history, attractions) : null
  if (vague) return vague
  return findBestMentionedAttraction(message, attractions)
}

function resolveVagueChoiceFromHistory(
  userMessage: string,
  history: HistoryEntry[],
  attractions: Attraction[]
): Attraction | null {
  const query = normalizeQuery(userMessage)
  const choiceIndex =
    /first|1st|number one|option 1|#1|the first|premier|premiere/.test(query) ? 0 :
    /second|2nd|number two|option 2|#2|the second|deuxieme|deuxième/.test(query) ? 1 :
    /third|3rd|number three|option 3|#3|the third|troisieme|troisième/.test(query) ? 2 :
    -1
  if (choiceIndex < 0) return null

  const lastAssistant = [...history].reverse().find((entry) => entry.role === 'assistant')?.content || ''
  const shortlist = findListedAttractions(lastAssistant, attractions)
  return shortlist[choiceIndex] || null
}

function findBestMentionedAttraction(text: string, attractions: Attraction[]): Attraction | null {
  let bestAttraction: Attraction | null = null
  let bestScore = 0

  for (const attraction of attractions) {
    if (!attraction?.attraction_name) continue
    const words = attraction.attraction_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ''))
      .filter((word) => word.length > 3)

    const normalizedText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ''))
      .filter((word) => word.length > 3)
      .join(' ')

    const matchCount = words.filter((word) => normalizedText.includes(word)).length
    const score = words.length > 0 ? matchCount / words.length : 0

    if (score > bestScore) {
      bestScore = score
      bestAttraction = attraction
    }
  }

  return bestScore >= 0.6 ? bestAttraction : null
}

export function findExplicitlyListedAttractions(response: string, attractions: Attraction[]): Attraction[] {
  return attractions.filter((attraction) => {
    const name = attraction.attraction_name
    if (!name) return false
    return (
      response.includes(`**${name}**`) ||
      response.includes(`### ${name}`) ||
      response.includes(`• **${name}**`) ||
      response.includes(`- **${name}**`) ||
      response.includes(`1. **${name}**`) ||
      response.includes(`2. **${name}**`) ||
      response.includes(`3. **${name}**`)
    )
  })
}

/** Find attractions referenced in assistant text (bold lists, or full name mentions). */
export function findListedAttractions(text: string, attractions: Attraction[]): Attraction[] {
  const explicit = findExplicitlyListedAttractions(text, attractions)
  if (explicit.length > 0) {
    return sortByTextPosition(text, explicit)
  }

  const lower = text.toLowerCase()
  const byLength = [...attractions].sort(
    (a, b) => (b.attraction_name?.length ?? 0) - (a.attraction_name?.length ?? 0)
  )
  const found: Attraction[] = []
  for (const attraction of byLength) {
    const name = attraction.attraction_name
    if (!name) continue
    if (lower.includes(name.toLowerCase())) {
      found.push(attraction)
    }
  }
  return sortByTextPosition(text, found).slice(0, 4)
}

function sortByTextPosition(text: string, attractions: Attraction[]): Attraction[] {
  const lower = text.toLowerCase()
  return [...attractions].sort((a, b) => {
    const ai = lower.indexOf((a.attraction_name || '').toLowerCase())
    const bi = lower.indexOf((b.attraction_name || '').toLowerCase())
    return ai - bi
  })
}

export function isShortlistResponse(text: string, attractions: Attraction[]): boolean {
  const lower = text.toLowerCase()
  if (
    lower.includes('which one would you like') ||
    lower.includes('which would you like') ||
    lower.includes('worth exploring') ||
    lower.includes('options nearby') ||
    lower.includes('coffee and café spots')
  ) {
    return true
  }
  return findListedAttractions(text, attractions).length >= 2
}

export function isChoiceSelectionMessage(message: string): boolean {
  const query = normalizeQuery(message)
  return /\b(first|second|third|1st|2nd|3rd|option\s*[123]|#\s*[123]|number\s*(one|two|three|1|2|3)|the\s+first|the\s+second|the\s+third)\b/.test(
    query
  )
}
