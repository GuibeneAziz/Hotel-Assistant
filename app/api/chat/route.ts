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
            trackAnalytics(message, guestProfile.hotel_id, guestProfile.age_range)
              .then((detectedLang) => {
                // Persist the detected language back to the guest profile
                createOrUpdateGuestProfile({
                  sessionId: guestProfile.session_id,
                  hotelId: guestProfile.hotel_id,
                  ageRange: guestProfile.age_range,
                  nationality: guestProfile.nationality,
                  travelPurpose: guestProfile.travel_purpose,
                  groupType: guestProfile.group_type,
                  preferredLanguage: detectedLang,
                }).catch(() => {/* ignore */})
              })
              .catch(() => {/* ignore */})
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

    const nearbyAttractions = hotelSettings?.nearbyAttractions || []

    // Enforce Step 1 locally — smaller models (e.g. Ollama 7B) often skip the
    // preference question and jump straight to listing attractions.
    if (shouldForceActivityStep1(message, conversationHistory || [], nearbyAttractions)) {
      const step1Response = buildStep1ActivityResponse(guestProfile)
      console.log('📍 Forcing activity Step 1 (preference question)')
      return NextResponse.json<ChatResponse>({
        success: true,
        response: step1Response,
      })
    }

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
      const facilityFallback = buildFacilityFallbackResponse(message, hotelSettings)
      const activitiesFallback = buildActivitiesFallbackResponse(
        message,
        hotelSettings,
        guestProfile,
        conversationHistory || []
      )
      const attractionFallback = buildAttractionFallbackResponse(
        message,
        hotelSettings?.nearbyAttractions || [],
        weather
      )
      const localFallback = facilityFallback || activitiesFallback || attractionFallback

      if (localFallback) {
        console.warn('AI unavailable; using local knowledge fallback:', aiError.message)
        aiResponse = localFallback
      } else {
        throw aiError
      }
    }
    console.log('✅ AI response generated, length:', aiResponse.length)

    // Append event images if the response mentions an event that has a photo
    const withEventImages = appendEventImages(aiResponse, hotelSettings?.specialEvents || [])
    const finalResponse = appendAttractionMedia(
      withEventImages,
      hotelSettings?.nearbyAttractions || [],
      message,
      conversationHistory || []
    )

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

// Analytics tracking helper — also returns detected language for profile update
async function trackAnalytics(
  message: string,
  hotelId: string,
  ageRange?: string
): Promise<string> {
  const { category, subcategory, topics, language } = detectQuestionCategory(message)
  await trackQuestionCategory(hotelId, category, subcategory, ageRange)
  for (const topic of topics) {
    await trackPopularTopic(hotelId, topic)
  }
  return language
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

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function queryMatchesAny(query: string, keywords: string[]): boolean {
  return keywords.some((keyword) => query.includes(keyword))
}

const ACTIVITY_EXPLORATION_KEYWORDS = [
  'go out', 'clear my head', 'things to do', 'what to do', 'where can i',
  'where should i', 'attraction', 'visit', 'explore', 'activities', 'nearby',
  'something to do', 'place to go', 'sortir', 'visiter', 'activite', 'activites',
  'que faire', 'ou aller', 'recommend', 'suggestion',
]

function isActivityExplorationQuery(query: string): boolean {
  return queryMatchesAny(query, ACTIVITY_EXPLORATION_KEYWORDS)
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
    lower.includes('i would love to find the perfect spot')
  )
}

function isSpecificAttractionQuery(query: string, attractions: any[]): boolean {
  const attraction = findBestMentionedAttraction(query, attractions)
  if (!attraction) return false

  const explorationPhrases = [
    'things to do', 'what to do', 'where can i', 'where should i',
    'recommend', 'suggestion', 'activities', 'nearby', 'explore',
  ]
  const detailPhrases = [
    'tell me about', 'more about', 'details about', 'information about',
    'how to get', 'how do i get', 'directions to',
  ]

  const isGenericExploration = explorationPhrases.some((phrase) => query.includes(phrase))
  const isDetailRequest = detailPhrases.some((phrase) => query.includes(phrase))

  if (isDetailRequest) return true
  if (isGenericExploration) return false

  return getAttractionMatchScore(query, attraction.attraction_name) >= 0.6
}

function shouldForceActivityStep1(
  message: string,
  conversationHistory: { role: string; content: string }[],
  attractions: any[]
): boolean {
  const query = normalizeQuery(message)
  if (!isActivityExplorationQuery(query)) return false
  if (isSpecificAttractionQuery(query, attractions)) return false

  const askedStep1 = (conversationHistory || []).some(
    (entry) => entry.role === 'assistant' && isStep1PreferenceQuestion(entry.content)
  )
  return !askedStep1
}

function buildStep1ActivityResponse(guestProfile?: any): string {
  const groupType = guestProfile?.group_type || guestProfile?.groupType
  if (groupType === 'couple' || groupType === 'honeymoon') {
    return "Since you're travelling as a couple, I'd love to find the perfect spot for you — are you looking for something romantic and scenic, or something more active and adventurous?"
  }
  if (groupType === 'family') {
    return "Since you're travelling as a family, you have some great options! Are the kids more into outdoor fun (beach, parks) or cultural visits (museums, ancient ruins)?"
  }
  if (groupType === 'solo') {
    return "Since you're exploring solo, you can really shape your own adventure — do you prefer outdoor activities (beach, nature, hiking) or indoor visits (museums, cafés, shopping)?"
  }
  if (groupType === 'group') {
    return "Since you're travelling as a group, are you looking for something lively and social, or a relaxed cultural experience?"
  }
  return "I'd love to help you explore the area! Do you prefer outdoor activities (beach, nature, parks) or cultural visits (museums, historic sites, local markets)?"
}

function buildFacilityFallbackResponse(userMessage: string, hotelSettings: any): string | null {
  if (!hotelSettings) return null

  const query = normalizeQuery(userMessage)
  const contact = hotelSettings.contact
  const contactLine = contact?.phone
    ? ` For more details, please contact the front desk at ${contact.phone}.`
    : ''

  const mealRules: Array<{
    keywords: string[]
    meal: 'breakfast' | 'lunch' | 'dinner'
    label: string
  }> = [
    { keywords: ['breakfast', 'petit dejeuner', 'morning meal'], meal: 'breakfast', label: 'Breakfast' },
    { keywords: ['lunch', 'dejeuner', 'midday meal'], meal: 'lunch', label: 'Lunch' },
    { keywords: ['dinner', 'diner', 'supper', 'evening meal'], meal: 'dinner', label: 'Dinner' },
  ]

  for (const rule of mealRules) {
    if (!queryMatchesAny(query, rule.keywords)) continue
    const schedule = hotelSettings.restaurant?.[rule.meal]
    if (!schedule) return null
    if (schedule.available && schedule.start && schedule.end) {
      return `${rule.label} is served from ${schedule.start} to ${schedule.end}.${contactLine}`
    }
    return `${rule.label} is currently not available.${contactLine}`
  }

  const facilityRules: Array<{
    keywords: string[]
    facility: any
    label: string
  }> = [
    { keywords: ['pool', 'swimming', 'piscine'], facility: hotelSettings.pool, label: 'The pool' },
    { keywords: ['spa', 'hammam', 'massage'], facility: hotelSettings.spa, label: 'The spa' },
    { keywords: ['gym', 'fitness', 'workout'], facility: hotelSettings.gym, label: 'The gym' },
    { keywords: ['kids club', 'children club', 'kids'], facility: hotelSettings.kidsClub, label: 'The kids club' },
  ]

  for (const rule of facilityRules) {
    if (!queryMatchesAny(query, rule.keywords) || !rule.facility) continue
    if (rule.facility.available && rule.facility.openTime && rule.facility.closeTime) {
      return `${rule.label} is open from ${rule.facility.openTime} to ${rule.facility.closeTime}.${contactLine}`
    }
    return `${rule.label} is currently closed.${contactLine}`
  }

  if (queryMatchesAny(query, ['bar', 'cocktail', 'drinks', 'infinity bar'])) {
    const pool = hotelSettings.pool
    if (!pool?.barOpenTime || !pool?.barCloseTime) {
      return `I don't have information about a hotel bar in my current data.${contactLine}`
    }
    return `Yes, the Infinity Bar by the pool is open from ${pool.barOpenTime} to ${pool.barCloseTime}. I don't have the drink menu — please contact the front desk for the menu.${contactLine}`
  }

  if (queryMatchesAny(query, ['wifi', 'wi-fi', 'internet'])) {
    const wifi = hotelSettings.wifi
    if (!wifi) return null
    if (!wifi.available) return `WiFi is currently unavailable.${contactLine}`
    if (wifi.password) {
      return `WiFi is available. Password: ${wifi.password}.${wifi.instructions ? ` ${wifi.instructions}` : ''}`
    }
    return `WiFi is available.${wifi.instructions ? ` ${wifi.instructions}` : ''}${contactLine}`
  }

  if (queryMatchesAny(query, ['parking', 'car park', 'park my car'])) {
    const parking = hotelSettings.parking
    if (!parking) return null
    if (!parking.available) return `Parking is currently unavailable.${contactLine}`
    const price = parking.price ? ` Price: ${parking.price}.` : ''
    return `Parking is available.${price}${parking.instructions ? ` ${parking.instructions}` : ''}${contactLine}`
  }

  if (queryMatchesAny(query, ['check in', 'check-in', 'arrival'])) {
    const checkIn = hotelSettings.checkIn
    if (!checkIn?.time) return null
    return `Check-in time is ${checkIn.time}.${checkIn.instructions ? ` ${checkIn.instructions}` : ''}${contactLine}`
  }

  if (queryMatchesAny(query, ['check out', 'check-out', 'departure', 'checkout'])) {
    const checkOut = hotelSettings.checkOut
    if (!checkOut?.time) return null
    return `Check-out time is ${checkOut.time}.${checkOut.instructions ? ` ${checkOut.instructions}` : ''}${contactLine}`
  }

  return null
}

function buildActivitiesFallbackResponse(
  userMessage: string,
  hotelSettings: any,
  guestProfile?: any,
  conversationHistory: { role: string; content: string }[] = []
): string | null {
  if (!hotelSettings) return null

  const query = normalizeQuery(userMessage)
  if (!isActivityExplorationQuery(query)) return null

  const attractions = hotelSettings.nearbyAttractions || []
  if (shouldForceActivityStep1(userMessage, conversationHistory, attractions)) {
    return buildStep1ActivityResponse(guestProfile)
  }

  const contactLine = hotelSettings.contact?.phone
    ? ` For more options, contact the front desk at ${hotelSettings.contact.phone}.`
    : ''

  if (attractions.length === 0) {
    return `I'd love to help you explore the area.${contactLine}`
  }

  const top = attractions.slice(0, 3)
  const list = top
    .map((a: any) => `• **${a.attraction_name}** — ${a.description || a.category || 'A nearby highlight'}`)
    .join('\n')
  return `Here are a few nearby options worth exploring:\n\n${list}\n\nWhich one would you like to know more about?`
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

function isStep2Shortlist(response: string, mentionedCount: number): boolean {
  if (mentionedCount < 2) return false
  const lower = response.toLowerCase()
  return (
    lower.includes('which one would you like') ||
    lower.includes('which would you like') ||
    lower.includes('let me know which') ||
    (/^\s*1[.)]\s/m.test(response) && /^\s*2[.)]\s/m.test(response))
  )
}

function resolveVagueChoice(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  attractions: any[]
): any | null {
  const query = normalizeQuery(userMessage)
  const choiceIndex =
    /first|1st|number one|option 1|#1|the first|premier|premiere/.test(query) ? 0 :
    /second|2nd|number two|option 2|#2|the second|deuxieme|deuxième/.test(query) ? 1 :
    /third|3rd|number three|option 3|#3|the third|troisieme|troisième/.test(query) ? 2 :
    -1
  if (choiceIndex < 0) return null

  const lastAssistant = [...conversationHistory]
    .reverse()
    .find((entry) => entry.role === 'assistant')?.content || ''
  const shortlist = findMentionedAttractions(lastAssistant, attractions, 4)
  return shortlist[choiceIndex] || null
}

function resolveFocusAttraction(
  userMessage: string,
  response: string,
  conversationHistory: { role: string; content: string }[],
  attractions: any[]
): any | null {
  const userPick = findBestMentionedAttraction(userMessage, attractions)
  if (userPick) return userPick

  const vaguePick = resolveVagueChoice(userMessage, conversationHistory, attractions)
  if (vaguePick) return vaguePick

  const mentioned = findMentionedAttractions(response, attractions, 4)
  if (mentioned.length === 1) return mentioned[0]
  if (mentioned.length >= 2 && isStep2Shortlist(response, mentioned.length)) return null

  if (mentioned.length >= 2) {
    const scored = mentioned
      .map((attraction) => ({
        attraction,
        score: getAttractionMatchScore(response, attraction.attraction_name),
      }))
      .sort((a, b) => b.score - a.score)

    const headingMatch = scored.find(
      ({ attraction }) =>
        response.includes(`**${attraction.attraction_name}**`) ||
        response.includes(`### ${attraction.attraction_name}`)
    )
    if (headingMatch) return headingMatch.attraction

    const [top, second] = scored
    if (top && second && top.score >= 0.75 && top.score - second.score >= 0.25) {
      return top.attraction
    }
  }

  return null
}

function buildImageTag(attraction: any): string {
  return `[IMAGE:${attraction.attraction_name}|${attraction.image_url}]`
}

function buildMapTag(attraction: any): string {
  return (attraction.latitude && attraction.longitude)
    ? `[MAP:${attraction.attraction_name}|${attraction.latitude}|${attraction.longitude}]`
    : `[MAP:${attraction.attraction_name}]`
}

/**
 * Attach attraction photos and a map card based on conversation step.
 *
 *  - Step 1 clarifying question → nothing.
 *  - Step 2 shortlist → labelled photos, no map.
 *  - Step 3 detail / guest picked one option → photo + Google Maps card.
 */
function appendAttractionMedia(
  response: string,
  attractions: any[],
  userMessage = '',
  conversationHistory: { role: string; content: string }[] = []
): string {
  if (response.includes('[MAP:')) return response

  const focus = resolveFocusAttraction(userMessage, response, conversationHistory, attractions)
  if (focus) {
    let out = response
    if (focus.image_url && !response.includes(focus.image_url) && !response.includes('[IMAGE:')) {
      out += '\n\n' + buildImageTag(focus)
    }
    out += '\n' + buildMapTag(focus)
    return out
  }

  const mentioned = findMentionedAttractions(response, attractions, 4)
  if (mentioned.length === 0) return response

  // Step-2 shortlist: several options listed, the guest hasn't chosen yet
  if (mentioned.length >= 2) {
    if (response.includes('[IMAGE:')) return response
    const photos = mentioned
      .filter((a: any) => a.image_url)
      .slice(0, 3)
      .map(buildImageTag)
    return photos.length > 0 ? response + '\n\n' + photos.join('\n') : response
  }

  // Step-3 detail: exactly one attraction in focus → photo + directions
  const attraction = mentioned[0]
  let out = response
  if (attraction.image_url && !response.includes('[IMAGE:')) out += '\n\n' + buildImageTag(attraction)
  out += '\n' + buildMapTag(attraction)
  return out
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
