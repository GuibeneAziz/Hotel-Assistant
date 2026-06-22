import pool from './db'
import {
  classifyQuestion,
  canonicalizeTopic,
  formatTopicLabel,
  aggregateTopicCounts,
  type ConversationEntry,
  type QuestionTopic,
} from './question-classifier'
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
// 2. QUESTION TOPIC TRACKING
// ============================================

const AI_SATISFACTION_TOPIC = 'ai_response_satisfaction'
export async function trackAiReaction(
  hotelId: string,
  reaction: 'positive' | 'negative'
) {
  const { ensureAnalyticsSchema } = await import('./analytics-schema')
  await ensureAnalyticsSchema()

  const sentimentCol = reaction === 'positive' ? 'positive_sentiment' : 'negative_sentiment'
  const client = await pool.connect()
  try {
    await client.query(
      `INSERT INTO popular_topics (hotel_id, topic, mention_count, date, positive_sentiment, negative_sentiment)
       VALUES ($1, $2, 1, CURRENT_DATE, $3, $4)
       ON CONFLICT (hotel_id, topic, date)
       DO UPDATE SET
         mention_count = popular_topics.mention_count + 1,
         ${sentimentCol} = popular_topics.${sentimentCol} + 1`,
      [hotelId, AI_SATISFACTION_TOPIC, reaction === 'positive' ? 1 : 0, reaction === 'negative' ? 1 : 0]
    )
  } finally {
    client.release()
  }
}

export async function getAiReactionStats(hotelId: string | null, timeRange: string) {
  const { ensureAnalyticsSchema } = await import('./analytics-schema')
  await ensureAnalyticsSchema()

  const interval =
    timeRange === '1d' ? '1 day' : timeRange === '30d' ? '30 days' : '7 days'

  const query = hotelId
    ? `SELECT COALESCE(SUM(positive_sentiment), 0) AS positive,
              COALESCE(SUM(negative_sentiment), 0) AS negative
       FROM popular_topics
       WHERE hotel_id = $1
         AND topic = $2
         AND date >= CURRENT_DATE - $3::interval`
    : `SELECT COALESCE(SUM(positive_sentiment), 0) AS positive,
              COALESCE(SUM(negative_sentiment), 0) AS negative
       FROM popular_topics
       WHERE topic = $1
         AND date >= CURRENT_DATE - $2::interval`

  const params = hotelId
    ? [hotelId, AI_SATISFACTION_TOPIC, interval]
    : [AI_SATISFACTION_TOPIC, interval]

  const result = await pool.query(query, params)
  const positive = parseInt(result.rows[0]?.positive ?? '0', 10)
  const negative = parseInt(result.rows[0]?.negative ?? '0', 10)
  const total = positive + negative
  const score = total > 0 ? Math.round((positive / total) * 100) : null

  return { positive, negative, total, score }
}

export async function trackPopularTopic(
  hotelId: string,
  topic: string,
  sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
) {
  const { ensureAnalyticsSchema } = await import('./analytics-schema')
  await ensureAnalyticsSchema()

  const client = await pool.connect()
  try {
    const storedTopic = canonicalizeTopic(topic)
    if (storedTopic === 'ai_response_satisfaction') return

    const sentimentColumn = sentiment === 'positive' ? 'positive_sentiment' 
      : sentiment === 'negative' ? 'negative_sentiment' 
      : null
    
    const query = `
      INSERT INTO popular_topics (
        hotel_id, topic, mention_count, date,
        positive_sentiment, negative_sentiment
      )
      VALUES ($1, $2, 1, CURRENT_DATE, $3, $4)
      ON CONFLICT (hotel_id, topic, date)
      DO UPDATE SET
        mention_count = popular_topics.mention_count + 1
        ${sentimentColumn ? `, ${sentimentColumn} = popular_topics.${sentimentColumn} + 1` : ''}
    `
    
    await client.query(query, [
      hotelId,
      storedTopic,
      sentiment === 'positive' ? 1 : 0,
      sentiment === 'negative' ? 1 : 0,
    ])
  } finally {
    client.release()
  }
}

/** Track guest question topics (single source of truth for question analytics). */
export async function trackQuestionTopics(
  hotelId: string,
  message: string,
  conversationHistory: ConversationEntry[] = []
): Promise<string> {
  const { topics, language, track } = classifyQuestion(message, conversationHistory)
  if (!track || topics.length === 0) return language

  for (const topic of topics) {
    await trackPopularTopic(hotelId, topic)
  }
  return language
}

export type { QuestionTopic as QuestionCategory }
export type QuestionSubcategory = string

export { formatTopicLabel }

/** Backward-compatible wrapper around classifyQuestion */
export function detectQuestionCategory(
  message: string,
  conversationHistory: ConversationEntry[] = []
) {
  const { topics, language } = classifyQuestion(message, conversationHistory)
  const primary = topics[0] ?? 'general_inquiry'
  return { category: primary, subcategory: primary, topics, language }
}

/** @deprecated Use trackQuestionTopics */
export async function trackQuestionCategory(
  hotelId: string,
  category: string,
  _subcategory?: string,
  _ageRange?: string
) {
  await trackPopularTopic(hotelId, category)
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
