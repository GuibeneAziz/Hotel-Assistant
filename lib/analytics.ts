// Analytics Helper Functions
// Track insights, not raw data
import pool from './db'

// ============================================
// 1. GUEST PROFILE MANAGEMENT
// ============================================

export interface GuestProfile {
  sessionId: string
  hotelId: string
  ageRange: '18-25' | '26-35' | '36-50' | '50+'
  nationality: string
  travelPurpose: 'leisure' | 'business' | 'family' | 'honeymoon'
  groupType: 'solo' | 'couple' | 'family' | 'group'
  preferredLanguage?: string
}

export async function createOrUpdateGuestProfile(profile: GuestProfile) {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      INSERT INTO guest_profiles (
        session_id, hotel_id, age_range, nationality, 
        travel_purpose, group_type, preferred_language,
        first_visit, last_visit, total_interactions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), 1)
      ON CONFLICT (session_id) 
      DO UPDATE SET
        last_visit = NOW(),
        total_interactions = guest_profiles.total_interactions + 1,
        preferred_language = COALESCE($7, guest_profiles.preferred_language)
      RETURNING id
    `, [
      profile.sessionId,
      profile.hotelId,
      profile.ageRange,
      profile.nationality,
      profile.travelPurpose,
      profile.groupType,
      profile.preferredLanguage || 'en'
    ])
    
    return result.rows[0]
  } finally {
    client.release()
  }
}

export async function getGuestProfile(sessionId: string) {
  const result = await pool.query(
    'SELECT * FROM guest_profiles WHERE session_id = $1',
    [sessionId]
  )
  return result.rows[0] || null
}

// ============================================
// 2. QUESTION CATEGORY TRACKING
// ============================================

export type QuestionCategory = 
  | 'facilities' | 'activities' | 'dining' | 'location' 
  | 'booking' | 'weather' | 'amenities' | 'events' | 'general'

export type QuestionSubcategory = 
  | 'pool_hours' | 'spa_prices' | 'breakfast_time' | 'gym_access'
  | 'wifi_password' | 'parking_info' | 'checkin_time' | 'checkout_time'
  | 'nearby_attractions' | 'hotel_activities' | 'kids_club'
  | string

export async function trackQuestionCategory(
  hotelId: string,
  category: QuestionCategory,
  subcategory: QuestionSubcategory,
  ageRange?: string
) {
  const client = await pool.connect()
  try {
    // Determine age column to increment
    const ageColumn = ageRange ? getAgeColumn(ageRange) : null
    
    const query = `
      INSERT INTO question_categories (
        hotel_id, category, subcategory, question_count, last_asked, date,
        ${ageColumn || 'age_18_25'}
      )
      VALUES ($1, $2, $3, 1, NOW(), CURRENT_DATE, ${ageColumn ? '1' : '0'})
      ON CONFLICT (hotel_id, category, subcategory, date)
      DO UPDATE SET
        question_count = question_categories.question_count + 1,
        last_asked = NOW()
        ${ageColumn ? `, ${ageColumn} = question_categories.${ageColumn} + 1` : ''}
    `
    
    await client.query(query, [hotelId, category, subcategory])
  } finally {
    client.release()
  }
}

function getAgeColumn(ageRange: string): string | null {
  const mapping: { [key: string]: string } = {
    '18-25': 'age_18_25',
    '26-35': 'age_26_35',
    '36-50': 'age_36_50',
    '50+': 'age_50_plus'
  }
  return mapping[ageRange] || null
}

// ============================================
// 3. POPULAR TOPICS TRACKING
// ============================================

export async function trackPopularTopic(
  hotelId: string,
  topic: string,
  sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
) {
  const client = await pool.connect()
  try {
    const sentimentColumn = sentiment === 'positive' ? 'positive_sentiment' 
      : sentiment === 'negative' ? 'negative_sentiment' 
      : null
    
    const query = `
      INSERT INTO popular_topics (
        hotel_id, topic, mention_count, date,
        ${sentimentColumn || 'positive_sentiment'}
      )
      VALUES ($1, $2, 1, CURRENT_DATE, ${sentimentColumn ? '1' : '0'})
      ON CONFLICT (hotel_id, topic, date)
      DO UPDATE SET
        mention_count = popular_topics.mention_count + 1
        ${sentimentColumn ? `, ${sentimentColumn} = popular_topics.${sentimentColumn} + 1` : ''}
    `
    
    await client.query(query, [hotelId, topic])
  } finally {
    client.release()
  }
}

// ============================================
// 4. LANGUAGE DETECTION
// ============================================

export function detectLanguage(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  // Arabic detection (common Arabic words and patterns)
  const arabicPattern = /[\u0600-\u06FF]/
  if (arabicPattern.test(message)) {
    return 'ar'
  }
  
  // French detection (common French words)
  const frenchWords = ['bonjour', 'merci', 'comment', 'où', 'quand', 'pourquoi', 'piscine', 'restaurant', 'chambre', 'prix']
  if (frenchWords.some(word => lowerMessage.includes(word))) {
    return 'fr'
  }
  
  // German detection (common German words)
  const germanWords = ['guten', 'danke', 'wie', 'wo', 'wann', 'warum', 'schwimmbad', 'zimmer', 'preis']
  if (germanWords.some(word => lowerMessage.includes(word))) {
    return 'de'
  }
  
  // Spanish detection (common Spanish words)
  const spanishWords = ['hola', 'gracias', 'cómo', 'dónde', 'cuándo', 'por qué', 'piscina', 'habitación', 'precio']
  if (spanishWords.some(word => lowerMessage.includes(word))) {
    return 'es'
  }
  
  // Italian detection (common Italian words)
  const italianWords = ['ciao', 'grazie', 'come', 'dove', 'quando', 'perché', 'piscina', 'camera', 'prezzo']
  if (italianWords.some(word => lowerMessage.includes(word))) {
    return 'it'
  }
  
  // Default to English
  return 'en'
}

// ============================================
// 5. MULTILINGUAL CATEGORY DETECTION
// ============================================

export function detectQuestionCategory(message: string): {
  category: QuestionCategory
  subcategory: QuestionSubcategory
  topics: string[]
  language: string
} {
  const lowerMessage = message.toLowerCase()
  const detectedLanguage = detectLanguage(message)
  
  // Multilingual keywords for each category
  const keywords = {
    pool: ['pool', 'swimming', 'swim', 'piscine', 'schwimmbad', 'alberca', 'مسبح'],
    spa: ['spa', 'massage', 'treatment', 'hammam', 'wellness', 'سبا', 'تدليك'],
    gym: ['gym', 'fitness', 'workout', 'salle de sport', 'fitnessstudio', 'gimnasio', 'صالة رياضية'],
    kids: ['kids club', 'children', 'kid', 'enfants', 'kinder', 'niños', 'أطفال'],
    breakfast: ['breakfast', 'morning meal', 'petit déjeuner', 'frühstück', 'desayuno', 'فطور'],
    lunch: ['lunch', 'afternoon meal', 'déjeuner', 'mittagessen', 'almuerzo', 'غداء'],
    dinner: ['dinner', 'evening meal', 'restaurant', 'dîner', 'abendessen', 'cena', 'عشاء'],
    wifi: ['wifi', 'internet', 'password', 'mot de passe', 'passwort', 'contraseña', 'واي فاي'],
    parking: ['parking', 'car', 'vehicle', 'stationnement', 'parkplatz', 'estacionamiento', 'موقف'],
    checkin: ['check.?in', 'arrival', 'arrivée', 'ankunft', 'llegada', 'تسجيل الدخول'],
    checkout: ['check.?out', 'departure', 'départ', 'abreise', 'salida', 'تسجيل الخروج'],
    activities: ['activity', 'activities', 'things to do', 'activités', 'aktivitäten', 'actividades', 'أنشطة'],
    attractions: ['nearby', 'attraction', 'tour', 'visit', 'excursion', 'visite', 'ausflug', 'visita', 'جولة'],
    weather: ['weather', 'temperature', 'rain', 'sunny', 'météo', 'wetter', 'clima', 'طقس'],
    events: ['event', 'show', 'entertainment', 'événement', 'veranstaltung', 'evento', 'حدث'],
    location: ['location', 'where', 'address', 'direction', 'adresse', 'wo', 'dónde', 'موقع']
  }
  
  // Check each category
  for (const [key, patterns] of Object.entries(keywords)) {
    for (const pattern of patterns) {
      if (lowerMessage.match(new RegExp(pattern, 'i'))) {
        // Map to category and subcategory
        if (key === 'pool') return { category: 'facilities', subcategory: 'pool_hours', topics: ['pool'], language: detectedLanguage }
        if (key === 'spa') return { category: 'facilities', subcategory: 'spa_prices', topics: ['spa'], language: detectedLanguage }
        if (key === 'gym') return { category: 'facilities', subcategory: 'gym_access', topics: ['gym'], language: detectedLanguage }
        if (key === 'kids') return { category: 'facilities', subcategory: 'kids_club', topics: ['kids_club'], language: detectedLanguage }
        if (key === 'breakfast') return { category: 'dining', subcategory: 'breakfast_time', topics: ['breakfast'], language: detectedLanguage }
        if (key === 'lunch') return { category: 'dining', subcategory: 'lunch_time', topics: ['lunch'], language: detectedLanguage }
        if (key === 'dinner') return { category: 'dining', subcategory: 'dinner_time', topics: ['dinner', 'restaurant'], language: detectedLanguage }
        if (key === 'wifi') return { category: 'amenities', subcategory: 'wifi_password', topics: ['wifi'], language: detectedLanguage }
        if (key === 'parking') return { category: 'amenities', subcategory: 'parking_info', topics: ['parking'], language: detectedLanguage }
        if (key === 'checkin') return { category: 'booking', subcategory: 'checkin_time', topics: ['checkin'], language: detectedLanguage }
        if (key === 'checkout') return { category: 'booking', subcategory: 'checkout_time', topics: ['checkout'], language: detectedLanguage }
        if (key === 'activities') return { category: 'activities', subcategory: 'hotel_activities', topics: ['activities'], language: detectedLanguage }
        if (key === 'attractions') return { category: 'activities', subcategory: 'nearby_attractions', topics: ['attractions'], language: detectedLanguage }
        if (key === 'weather') return { category: 'weather', subcategory: 'current_weather', topics: ['weather'], language: detectedLanguage }
        if (key === 'events') return { category: 'events', subcategory: 'special_events', topics: ['events'], language: detectedLanguage }
        if (key === 'location') return { category: 'location', subcategory: 'hotel_location', topics: ['location'], language: detectedLanguage }
      }
    }
  }
  
  // Default
  return { category: 'general', subcategory: 'general_inquiry', topics: ['general'], language: detectedLanguage }
}

// ============================================
// 6. ANALYTICS QUERIES (for dashboard)
// ============================================

export async function getMostAskedQuestions(hotelId: string, limit: number = 10) {
  const result = await pool.query(`
    SELECT 
      category, 
      subcategory, 
      SUM(question_count) as total_count,
      MAX(last_asked) as last_asked
    FROM question_categories
    WHERE hotel_id = $1
      AND date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY category, subcategory
    ORDER BY total_count DESC
    LIMIT $2
  `, [hotelId, limit])
  
  return result.rows
}

export async function getGuestDemographics(hotelId: string) {
  const result = await pool.query(`
    SELECT 
      age_range,
      nationality,
      travel_purpose,
      group_type,
      COUNT(*) as count
    FROM guest_profiles
    WHERE hotel_id = $1
      AND first_visit >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY age_range, nationality, travel_purpose, group_type
    ORDER BY count DESC
  `, [hotelId])
  
  return result.rows
}

export async function getPopularActivities(hotelId: string, limit: number = 10) {
  const result = await pool.query(`
    SELECT 
      topic,
      SUM(mention_count) as total_mentions,
      SUM(positive_sentiment) as positive_count,
      SUM(negative_sentiment) as negative_count
    FROM popular_topics
    WHERE hotel_id = $1
      AND date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY topic
    ORDER BY total_mentions DESC
    LIMIT $2
  `, [hotelId, limit])
  
  return result.rows
}

export async function getAverageSatisfaction(hotelId: string) {
  const result = await pool.query(`
    SELECT 
      AVG(CASE 
        WHEN positive_sentiment > negative_sentiment THEN 5
        WHEN positive_sentiment = negative_sentiment THEN 3
        ELSE 1
      END) as avg_satisfaction,
      COUNT(*) as total_interactions
    FROM popular_topics
    WHERE hotel_id = $1
      AND date >= CURRENT_DATE - INTERVAL '30 days'
  `, [hotelId])
  
  return result.rows[0] || { avg_satisfaction: 0, total_interactions: 0 }
}
