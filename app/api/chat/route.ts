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

    // Get guest profile for analytics (if available)
    let guestProfile = null
    if (sessionId) {
      try {
        guestProfile = await getGuestProfile(sessionId)
        
        // Update interaction count
        if (guestProfile) {
          await createOrUpdateGuestProfile({
            sessionId: guestProfile.session_id,
            hotelId: guestProfile.hotel_id,
            ageRange: guestProfile.age_range,
            nationality: guestProfile.nationality,
            travelPurpose: guestProfile.travel_purpose,
            groupType: guestProfile.group_type
          })
        }
      } catch (analyticsError) {
        console.error('Analytics error (non-blocking):', analyticsError instanceof Error ? analyticsError.message : analyticsError)
        // Don't throw - analytics errors shouldn't break chat
        guestProfile = null
      }
    }

    // Track analytics (async, don't wait)
    // Get hotel ID from guest profile (saved during registration)
    if (guestProfile && guestProfile.hotel_id) {
      trackAnalytics(message, guestProfile.hotel_id, guestProfile.age_range).catch(err => {
        console.error('Analytics tracking error (non-blocking):', err.message)
        // Don't throw - analytics errors shouldn't break chat
      })
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
    const contextForModel = relevantContext.trim().length >= 250 ? relevantContext : fullKnowledge
    console.log('🛡️ Context sent to model, length:', contextForModel.length)

    // Generate AI response with context
    console.log('🤖 Calling AI service...')
    const aiResponse = await generateResponse(
      message,
      contextForModel,
      conversationHistory || []
    )
    console.log('✅ AI response generated, length:', aiResponse.length)

    // Append event images if the response mentions an event that has a photo
    const finalResponse = appendEventImages(aiResponse, hotelSettings?.specialEvents || [])

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
