export type QuestionTopic =
  | 'nearby_attractions'
  | 'cultural_visits'
  | 'hotel_activities'
  | 'pool'
  | 'spa'
  | 'gym'
  | 'kids_club'
  | 'dining'
  | 'wifi'
  | 'parking'
  | 'check_in'
  | 'check_out'
  | 'events'
  | 'weather'
  | 'location'
  | 'general_inquiry'

export const TOPIC_LABELS: Record<QuestionTopic, string> = {
  nearby_attractions: 'Nearby & outdoor activities',
  cultural_visits: 'Culture & sightseeing',
  hotel_activities: 'Hotel activities',
  pool: 'Pool',
  spa: 'Spa & wellness',
  gym: 'Gym & fitness',
  kids_club: 'Kids club',
  dining: 'Dining & restaurant',
  wifi: 'WiFi & internet',
  parking: 'Parking',
  check_in: 'Check-in',
  check_out: 'Check-out',
  events: 'Events & shows',
  weather: 'Weather',
  location: 'Location & directions',
  general_inquiry: 'General',
}

export interface ConversationEntry {
  role: string
  content: string
}

export interface QuestionClassification {
  topics: QuestionTopic[]
  language: string
  track: boolean
}

export function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function queryMatchesAny(query: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    if (keyword.includes(' ')) return query.includes(keyword)
    return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(query)
  })
}

const OUTDOOR_KEYWORDS = [
  'outdoor', 'outside', 'beach', 'sea', 'nature', 'park', 'hiking', 'trek',
  'plage', 'mer', 'plein air', 'exterieur', 'strand', 'natur', 'playa',
  'water sport', 'snorkel', 'dive', 'boat', 'sail', 'quad', 'camel',
]

const CULTURAL_KEYWORDS = [
  'museum', 'historic', 'history', 'ruins', 'medina', 'souk', 'market',
  'cultural', 'heritage', 'monument', 'archaeolog', 'carthage', 'sidi bou',
  'musee', 'patrimoine', 'antique', 'museo', 'cultura',
]

const HOTEL_ACTIVITY_KEYWORDS = [
  'in the hotel', 'at the hotel', 'inside the hotel', 'on site', 'on-site',
  'hotel activity', 'hotel activities', 'animation', 'entertainment',
  'a l hotel', 'dans l hotel', 'sur place', 'im hotel', 'en el hotel',
]

export const ACTIVITY_EXPLORATION_KEYWORDS = [
  'go out', 'clear my head', 'things to do', 'what to do', 'what can i do', 'what can we do',
  'where can i', 'where should i', 'where to go', 'attraction', 'visit', 'explore', 'activities',
  'activity', 'nearby', 'something to do', 'place to go', 'day trip', 'excursion',
  'sightseeing', 'tourist', 'tour', 'recommend', 'suggestion', 'suggestions',
  'fun', 'bored', 'plan for', 'ideas for', 'what can we', 'what can i', 'do nearby', 'do around',
  'sortir', 'visiter', 'activite', 'activites', 'que faire', 'ou aller',
  'ausflug', 'unternehmen', 'que hacer', 'donde ir', 'cosa fare', 'dove andare',
  'hammamet', 'carthage', 'tunis', 'sousse', 'monastir', 'djerba',
]

const DINING_KEYWORDS = [
  'breakfast', 'lunch', 'dinner', 'restaurant', 'meal', 'food', 'eat', 'menu',
  'bar', 'cocktail', 'drink', 'room service', 'petit dejeuner', 'dejeuner',
  'diner', 'repas', 'fruhstuck', 'mittagessen', 'abendessen', 'desayuno', 'cena',
]

const POOL_KEYWORDS = ['pool', 'swimming', 'swim', 'piscine', 'schwimmbad', 'alberca', 'natation']
const SPA_KEYWORDS = ['spa', 'massage', 'treatment', 'hammam', 'wellness', 'sauna', 'thalasso']
const GYM_KEYWORDS = ['gym', 'fitness', 'workout', 'salle de sport', 'fitnessstudio', 'gimnasio']
const KIDS_KEYWORDS = ['kids club', 'children', 'kid', 'enfants', 'kinder', 'niños', 'baby']
const WIFI_KEYWORDS = ['wifi', 'wi-fi', 'internet', 'password', 'mot de passe', 'passwort']
const PARKING_KEYWORDS = ['parking', 'car park', 'vehicle', 'stationnement', 'parkplatz']
const CHECKIN_KEYWORDS = ['check in', 'check-in', 'arrival', 'arrivee', 'ankunft', 'llegada']
const CHECKOUT_KEYWORDS = ['check out', 'check-out', 'checkout', 'departure', 'depart', 'abreise']
const EVENT_KEYWORDS = ['event', 'show', 'concert', 'party', 'gala', 'evenement', 'veranstaltung']
const WEATHER_KEYWORDS = ['weather', 'temperature', 'rain', 'sunny', 'forecast', 'meteo', 'wetter', 'clima']
const LOCATION_KEYWORDS = ['location', 'address', 'direction', 'how to get', 'where is', 'adresse', 'wo ist']

const LOW_SIGNAL_PATTERN =
  /^(yes|no|ok|okay|thanks|thank you|merci|hi|hello|bonjour|sure|great|perfect|oui|si|daccord|cool|nice|please|pls|yep|yeah)\.?!?$/i

function isLowSignalMessage(query: string): boolean {
  const trimmed = query.trim()
  return trimmed.length < 3 || LOW_SIGNAL_PATTERN.test(trimmed)
}

function isStep1PreferenceQuestion(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('are you looking for') ||
    lower.includes('do you prefer') ||
    lower.includes('are the kids more into') ||
    lower.includes('would you prefer') ||
    lower.includes('shape your own adventure') ||
    lower.includes("i'd love to find the perfect spot") ||
    lower.includes('i would love to find the perfect spot') ||
    lower.includes('outdoor activities') ||
    lower.includes('cultural visits')
  )
}

export function isActivityExplorationQuery(query: string): boolean {
  return queryMatchesAny(query, ACTIVITY_EXPLORATION_KEYWORDS)
}

function inferTopicsFromHistory(
  message: string,
  history: ConversationEntry[]
): QuestionTopic[] | null {
  const query = normalizeQuery(message)
  const reversed = [...(history || [])].reverse()
  const lastAssistant = reversed.find((e) => e.role === 'assistant')?.content || ''
  const lastUser = reversed.find((e) => e.role === 'user')?.content || ''
  const normalizedAssistant = normalizeQuery(lastAssistant)
  const normalizedLastUser = normalizeQuery(lastUser)

  if (isStep1PreferenceQuestion(lastAssistant)) {
    if (queryMatchesAny(query, OUTDOOR_KEYWORDS)) return ['nearby_attractions']
    if (queryMatchesAny(query, CULTURAL_KEYWORDS)) return ['cultural_visits']
    if (queryMatchesAny(query, HOTEL_ACTIVITY_KEYWORDS)) return ['hotel_activities']
    if (queryMatchesAny(query, ['romantic', 'adventur', 'active', 'relax', 'lively', 'social'])) {
      return ['nearby_attractions']
    }
    return ['nearby_attractions']
  }

  if (
    /option\s*[123]|first|second|third|number\s*[123]|the\s*(first|second|third)|premier|deuxieme|troisieme/.test(query) &&
    (normalizedAssistant.includes('which one') ||
      normalizedAssistant.includes('nearby options') ||
      normalizedAssistant.includes('worth exploring'))
  ) {
    return ['nearby_attractions']
  }

  if (
    queryMatchesAny(query, ['tell me more', 'more about', 'more info', 'details', 'how to get', 'directions']) &&
    (isActivityExplorationQuery(normalizedLastUser) ||
      normalizedAssistant.includes('attraction') ||
      normalizedAssistant.includes('distance from the hotel'))
  ) {
    return ['nearby_attractions']
  }

  if (isActivityExplorationQuery(normalizedLastUser) && isLowSignalMessage(query)) {
    return ['nearby_attractions']
  }

  return null
}

function detectLanguage(message: string): string {
  const lowerMessage = message.toLowerCase()
  if (/[\u0600-\u06FF]/.test(message)) return 'ar'
  if (['bonjour', 'merci', 'comment', 'ou ', 'quand', 'pourquoi', 'piscine', 'chambre'].some((w) => lowerMessage.includes(w))) return 'fr'
  if (['guten', 'danke', 'schwimmbad', 'zimmer', 'wo ', 'wann'].some((w) => lowerMessage.includes(w))) return 'de'
  if (['hola', 'gracias', 'donde', 'cuando', 'habitacion'].some((w) => lowerMessage.includes(w))) return 'es'
  if (['ciao', 'grazie', 'dove', 'quando', 'camera'].some((w) => lowerMessage.includes(w))) return 'it'
  return 'en'
}

/** Classify a guest message into one or more discussion topics. */
export function classifyQuestion(
  message: string,
  conversationHistory: ConversationEntry[] = []
): QuestionClassification {
  const query = normalizeQuery(message)
  const language = detectLanguage(message)

  if (isLowSignalMessage(query)) {
    const inferred = inferTopicsFromHistory(message, conversationHistory)
    if (inferred) return { topics: inferred, language, track: true }
    return { topics: [], language, track: false }
  }

  const rules: Array<{ topic: QuestionTopic; keywords: string[] }> = [
    { topic: 'pool', keywords: POOL_KEYWORDS },
    { topic: 'spa', keywords: SPA_KEYWORDS },
    { topic: 'gym', keywords: GYM_KEYWORDS },
    { topic: 'kids_club', keywords: KIDS_KEYWORDS },
    { topic: 'dining', keywords: DINING_KEYWORDS },
    { topic: 'wifi', keywords: WIFI_KEYWORDS },
    { topic: 'parking', keywords: PARKING_KEYWORDS },
    { topic: 'check_in', keywords: CHECKIN_KEYWORDS },
    { topic: 'check_out', keywords: CHECKOUT_KEYWORDS },
    { topic: 'events', keywords: EVENT_KEYWORDS },
    { topic: 'weather', keywords: WEATHER_KEYWORDS },
    { topic: 'location', keywords: LOCATION_KEYWORDS },
    { topic: 'hotel_activities', keywords: HOTEL_ACTIVITY_KEYWORDS },
    { topic: 'cultural_visits', keywords: CULTURAL_KEYWORDS },
    { topic: 'nearby_attractions', keywords: [...ACTIVITY_EXPLORATION_KEYWORDS, ...OUTDOOR_KEYWORDS] },
  ]

  for (const rule of rules) {
    if (queryMatchesAny(query, rule.keywords)) {
      return { topics: [rule.topic], language, track: true }
    }
  }

  const inferred = inferTopicsFromHistory(message, conversationHistory)
  if (inferred) return { topics: inferred, language, track: true }

  return { topics: ['general_inquiry'], language, track: true }
}

const LEGACY_TOPIC_MAP: Record<string, QuestionTopic> = {
  activities: 'nearby_attractions',
  attractions: 'nearby_attractions',
  general: 'general_inquiry',
  breakfast: 'dining',
  lunch: 'dining',
  dinner: 'dining',
  restaurant: 'dining',
  checkin: 'check_in',
  checkout: 'check_out',
  kids: 'kids_club',
  pool_hours: 'pool',
  spa_prices: 'spa',
  gym_access: 'gym',
  wifi_password: 'wifi',
  parking_info: 'parking',
  hotel_activities: 'hotel_activities',
  nearby_attractions: 'nearby_attractions',
  cultural_visits: 'cultural_visits',
  hotel_location: 'location',
  special_events: 'events',
  current_weather: 'weather',
  general_inquiry: 'general_inquiry',
}

/** Map any stored or legacy topic slug to one canonical analytics topic. */
export function canonicalizeTopic(topic: string): QuestionTopic | 'ai_response_satisfaction' {
  if (topic === 'ai_response_satisfaction') return 'ai_response_satisfaction'
  if (topic in TOPIC_LABELS) return topic as QuestionTopic
  if (LEGACY_TOPIC_MAP[topic]) return LEGACY_TOPIC_MAP[topic]
  return 'general_inquiry'
}

const LEGACY_TOPIC_LABELS: Record<string, string> = {
  activities: 'Nearby & outdoor activities',
  attractions: 'Nearby & outdoor activities',
  general: 'General',
  breakfast: 'Dining & restaurant',
  lunch: 'Dining & restaurant',
  dinner: 'Dining & restaurant',
  restaurant: 'Dining & restaurant',
  checkin: 'Check-in',
  checkout: 'Check-out',
}

export function formatTopicLabel(topic: string): string {
  const canonical = canonicalizeTopic(topic)
  if (canonical === 'ai_response_satisfaction') return 'AI satisfaction'
  if (LEGACY_TOPIC_LABELS[topic]) return LEGACY_TOPIC_LABELS[topic]
  return TOPIC_LABELS[canonical] ?? topic.replace(/_/g, ' ')
}

/** Merge raw DB topic rows into canonical topics for charts. */
export function aggregateTopicCounts(
  rows: Array<{ topic: string; total: string | number }>,
  exclude: string[] = []
): Array<{ name: string; value: number; key: string }> {
  const totals = new Map<string, number>()

  for (const row of rows) {
    const canonical = canonicalizeTopic(row.topic)
    if (canonical === 'ai_response_satisfaction' || exclude.includes(canonical)) continue
    const value = parseInt(String(row.total), 10)
    totals.set(canonical, (totals.get(canonical) ?? 0) + value)
  }

  return Array.from(totals.entries())
    .map(([key, value]) => ({
      key,
      name: formatTopicLabel(key),
      value,
    }))
    .sort((a, b) => b.value - a.value)
}
