import { NextResponse } from 'next/server'
import { generateResponse } from '@/lib/ai-service'
import { buildHotelKnowledge, buildPersonalizedHotelKnowledge, extractRelevantContext } from '@/lib/rag-knowledge'
import { chatMessageSchema, validateAndSanitize } from '@/lib/validation'
import type { ApiResponse, ChatResponse } from '@/types/api'
import { 
  detectQuestionCategory, 
  trackQuestionCategory, 
  trackPopularTopic,
  getGuestProfile,
  createOrUpdateGuestProfile
} from '@/lib/analytics'
import { checkRateLimit } from '@/lib/rate-limit-helper'
import { getAllHotelSettings } from '@/lib/db'

export async function POST(request: Request) {
  try {
    console.log('🔍 Chat API called')
    
    // OWASP: Rate limiting prevents API abuse
    const rateLimitResponse = await checkRateLimit(request, 'chat')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    console.log('📝 Request body keys:', Object.keys(body))

    // Validate and sanitize input with Zod
    // OWASP: Always validate and sanitize user input
    const validation = validateAndSanitize(chatMessageSchema, body)
    
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.errors)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid request data',
        message: validation.errors?.join(', ')
      }, { status: 400 })
    }

    const { message, hotelData, weather, conversationHistory, sessionId } = validation.data!
    console.log('✅ Validation passed, message length:', message.length)

    // Load hotel settings from database
    let hotelSettings: any = null
    try {
      const allHotelSettings = await getAllHotelSettings()
      const hotelId = hotelData?.id || Object.keys(allHotelSettings)[0]
      hotelSettings = allHotelSettings[hotelId] || null
    } catch (dbError: any) {
      console.error('Failed to load hotel settings from DB:', dbError.message)
      // Continue without hotel settings - AI will have limited context
    }

    if (!hotelSettings) {
      console.warn('⚠️ No hotel settings found, using minimal context')
    }

    // Fetch guest profile (needed for personalised knowledge building).
    // The interaction-count update and analytics tracking are fire-and-forget
    // so they never delay the AI response.
    let guestProfile = null
    if (sessionId) {
      try {
        guestProfile = await getGuestProfile(sessionId)

        if (guestProfile) {
          // Non-blocking: update interaction count + track analytics in background
          createOrUpdateGuestProfile({
            sessionId: guestProfile.session_id,
            hotelId: guestProfile.hotel_id,
            ageRange: guestProfile.age_range,
            nationality: guestProfile.nationality,
            travelPurpose: guestProfile.travel_purpose,
            groupType: guestProfile.group_type
          }).catch(() => {/* ignore */})

          if (guestProfile.hotel_id) {
            trackAnalytics(message, guestProfile.hotel_id, guestProfile.age_range).catch(() => {/* ignore */})
          }
        }
      } catch (analyticsError) {
        guestProfile = null
      }
    }

    // Build hotel knowledge base
    console.log('🏨 Building hotel knowledge...')
    let fullKnowledge: string
    try {
      if (guestProfile && guestProfile.hotel_id && hotelSettings) {
        const guestProfileData = {
          ageRange: guestProfile.age_range as any,
          groupType: guestProfile.group_type as any,
          travelPurpose: guestProfile.travel_purpose as any
        }
        fullKnowledge = await buildPersonalizedHotelKnowledge(
          hotelSettings, hotelData, weather, guestProfileData, guestProfile.hotel_id
        )
      } else {
        fullKnowledge = buildHotelKnowledge(hotelSettings, hotelData, weather)
      }
    } catch (knowledgeError: any) {
      console.error('Knowledge build error (non-blocking):', knowledgeError.message)
      fullKnowledge = buildHotelKnowledge(hotelSettings, hotelData, weather)
    }
    console.log('📚 Knowledge built, length:', fullKnowledge.length)
    
    // Extract relevant context, but fall back to full knowledge when the slice is too thin.
    const relevantContext = extractRelevantContext(message, fullKnowledge)
    console.log('🎯 Relevant context extracted, length:', relevantContext.length)
    const rawContextForModel = relevantContext.trim().length >= 250 ? relevantContext : fullKnowledge
    const contextForModel = rawContextForModel.length > 12000
      ? rawContextForModel.slice(0, 12000)
      : rawContextForModel
    console.log('🛡️ Context sent to model, length:', contextForModel.length)

    // Generate AI response with context. If the LLM provider is temporarily
    // rate-limited, keep the attraction detail flow usable from local DB data.
    console.log('🤖 Calling AI service...')
    let aiResponse: string
    try {
      aiResponse = await generateResponse(
        message,
        contextForModel,
        conversationHistory || []
      )
    } catch (aiError: any) {
      const fallback = buildAttractionFallbackResponse(
        message,
        hotelSettings?.nearbyAttractions || [],
        weather
      )

      if (fallback && aiError.message?.toLowerCase().includes('rate limit')) {
        console.warn('AI rate-limited; using local attraction fallback')
        aiResponse = fallback
      } else {
        throw aiError
      }
    }
    console.log('✅ AI response generated, length:', aiResponse.length)

    // Append event images if the response mentions an event that has a photo
    const withEventImages = appendEventImages(aiResponse, hotelSettings?.specialEvents || [])
    // Append photos for Step-2 attraction shortlists so each option has visual context
    const withShortlistImages = appendShortlistAttractionImages(withEventImages, hotelSettings?.nearbyAttractions || [])
    // Append attraction photo when the AI gives detailed info about a specific attraction
    const withAttractionImages = appendAttractionImages(withShortlistImages, hotelSettings?.nearbyAttractions || [])
    // Append map tag for the same Step-3 detailed responses
    const finalResponse = appendMapTag(withAttractionImages, hotelSettings?.nearbyAttractions || [])

    return NextResponse.json<ChatResponse>({ 
      success: true,
      response: finalResponse
    })
    
  } catch (error: any) {
    console.error('Chat API Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // OWASP: Sanitize error messages - don't expose internal details
    const isProduction = process.env.NODE_ENV === 'production'
    const errorMessage = isProduction 
      ? 'An error occurred processing your request'
      : error.message || 'Failed to generate response'
    
    return NextResponse.json<ChatResponse>(
      { 
        success: false,
        error: errorMessage,
        response: `I apologize, but I encountered an error. Please try again.`
      },
      { status: 500 }
    )
  }
}

// Analytics tracking helper
async function trackAnalytics(message: string, hotelId: string, ageRange?: string) {
  // Detect question category and language
  const { category, subcategory, topics, language } = detectQuestionCategory(message)
  
  // Track question category
  await trackQuestionCategory(hotelId, category, subcategory, ageRange)
  
  // Track popular topics
  for (const topic of topics) {
    await trackPopularTopic(hotelId, topic)
  }
  
  // Log detected language for monitoring
  console.log(`📊 Analytics: category=${category}, language=${language}`)
}

function getSignificantWords(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ''))
    .filter((word) => word.length > 3)
}

function getAttractionMatchScore(text: string, attractionName: string): number {
  const words = getSignificantWords(attractionName)
  if (words.length === 0) return 0

  const normalizedText = getSignificantWords(text).join(' ')
  const matchCount = words.filter((word) => normalizedText.includes(word)).length
  return matchCount / words.length
}

function findBestMentionedAttraction(text: string, attractions: any[]): any | null {
  let bestAttraction: any | null = null
  let bestScore = 0

  for (const attraction of attractions) {
    if (!attraction?.attraction_name) continue
    const score = getAttractionMatchScore(text, attraction.attraction_name)

    if (score > bestScore) {
      bestScore = score
      bestAttraction = attraction
    }
  }

  return bestScore >= 0.6 ? bestAttraction : null
}

function findMentionedAttractions(text: string, attractions: any[], limit = 3): any[] {
  return attractions
    .filter((attraction) => attraction?.attraction_name)
    .map((attraction) => ({
      attraction,
      score: getAttractionMatchScore(text, attraction.attraction_name),
    }))
    .filter(({ score }) => score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ attraction }) => attraction)
}

function buildAttractionFallbackResponse(
  userMessage: string,
  attractions: any[],
  weather?: any
): string | null {
  const attraction = findBestMentionedAttraction(userMessage, attractions)
  if (!attraction) return null

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

// Health check endpoint
export async function GET() {
  try {
    const hasApiKey = !!process.env.GROQ_API_KEY
    const hasRedis = !!process.env.REDIS_URL
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        status: 'ok',
        aiConfigured: hasApiKey,
        redisConfigured: hasRedis,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Service unavailable'
      },
      { status: 500 }
    )
  }
}

function isAttractionShortlistResponse(response: string): boolean {
  const lower = response.toLowerCase()
  return (
    lower.includes('which one would you like') ||
    lower.includes('which would you like to know more') ||
    lower.includes('which would you prefer')
  )
}

function buildImageTag(attraction: any): string {
  return `[IMAGE:${attraction.attraction_name}|${attraction.image_url}]`
}

/**
 * Append one labelled image per mentioned attraction when the AI gives a Step-2
 * shortlist. This makes each option feel visual without asking the model to
 * invent image URLs.
 */
function appendShortlistAttractionImages(response: string, attractions: any[]): string {
  if (!isAttractionShortlistResponse(response)) return response
  if (response.includes('[IMAGE:')) return response

  const withImages = attractions.filter((a: any) => a.image_url)
  const mentioned = findMentionedAttractions(response, withImages, 3)
  if (mentioned.length === 0) return response

  const imageTags = mentioned.map(buildImageTag).join('\n')
  return response + '\n\n' + imageTags
}

/**
 * Append a labelled [IMAGE:name|url] block when the AI gives a DETAILED (Step 3)
 * response about one specific attraction.
 *
 * Rules to avoid false-positives on shortlists / question replies:
 *  - Response must be at least 500 chars (a shortlist with 3 × 3-line items is
 *    ~350–420 chars; a full Step-3 detail reply is 500+).
 *  - Response must NOT end with "Which one would you like to know more about?"
 *    (that phrase marks a Step-2 shortlist).
 *  - Only the first matching attraction image is appended.
 */
function appendAttractionImages(response: string, attractions: any[]): string {
  if (response.includes('[IMAGE:')) return response
  if (response.length < 500) return response
  // If it looks like a Step-2 shortlist, skip
  if (isAttractionShortlistResponse(response)) return response

  const withImages = attractions.filter((a: any) => a.image_url)
  if (withImages.length === 0) return response

  const attraction = findBestMentionedAttraction(response, withImages)
  return attraction
    ? response + '\n\n' + buildImageTag(attraction)
    : response
}

/**
 * Append a [MAP:name|lat|lon] or [MAP:name] tag whenever the response talks
 * about a specific attraction (directions, details, distance, etc.).
 *
 * Blocked only when the response is a Step-2 multi-option shortlist
 * (i.e. it offers several choices and asks the user to pick one).
 */
function appendMapTag(response: string, attractions: any[]): string {
  const lower = response.toLowerCase()
  // Short responses are almost always clarifying questions or acknowledgements — skip
  if (response.length < 300 && !lower.includes('here are the details for')) return response

  // Phrases that mark Step-1 (clarifying questions) or Step-2 (shortlists) — skip map
  const skipPhrases = [
    'which one would you like',
    'which would you like to know more',
    'which would you prefer',
    'would you like more details about',
    'which of these',
    'are you looking for',
    'what kind of',
    'what type of',
    'do you prefer',
    'could you tell me',
    'can you tell me',
    'would you like me to',
  ]
  if (skipPhrases.some((p) => lower.includes(p))) return response

  const attraction = findBestMentionedAttraction(response, attractions)
  if (!attraction) return response

  const tag = (attraction.latitude && attraction.longitude)
    ? `[MAP:${attraction.attraction_name}|${attraction.latitude}|${attraction.longitude}]`
    : `[MAP:${attraction.attraction_name}]`
  return response + '\n' + tag
}

// Append [IMAGE:url] tags for events mentioned in the AI response that have photos
function appendEventImages(response: string, events: any[]): string {
  const eventsWithImages = events.filter((e: any) => e.imageUrl)
  if (eventsWithImages.length === 0) return response
  const responseLower = response.toLowerCase()
  const imageTags: string[] = []
  for (const event of eventsWithImages) {
    const titleWords = event.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
    if (titleWords.some((word: string) => responseLower.includes(word))) {
      imageTags.push(`[IMAGE:${event.imageUrl}]`)
    }
  }
  return imageTags.length > 0 ? response + '\n' + imageTags.join('\n') : response
}
