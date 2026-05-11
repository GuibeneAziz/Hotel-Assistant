import { chatMessageSchema, validateAndSanitize } from '@/lib/validation'
import { buildHotelKnowledge, buildPersonalizedHotelKnowledge, extractRelevantContext } from '@/lib/rag-knowledge'
import { generateResponseStream } from '@/lib/ai-service'
import { getAllHotelSettings } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit-helper'
import { getGuestProfile } from '@/lib/analytics'
import { appendEventImages } from '@/lib/event-image-helper'

export async function POST(request: Request) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, 'chat')
  if (rateLimitResponse) return rateLimitResponse

  const body = await request.json()
  const validation = validateAndSanitize(chatMessageSchema, body)
  if (!validation.success) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
  }

  const { message, hotelData, weather, conversationHistory, sessionId } = validation.data!

  // Load hotel settings
  let hotelSettings: any = null
  try {
    const all = await getAllHotelSettings()
    const hotelId = hotelData?.id || Object.keys(all)[0]
    hotelSettings = all[hotelId] || null
  } catch (e) {
    console.error('DB error loading hotel settings:', e)
  }

  // Guest profile for personalization
  let guestProfile: any = null
  if (sessionId) {
    try { guestProfile = await getGuestProfile(sessionId) } catch {}
  }

  // Build knowledge
  let fullKnowledge = ''
  try {
    if (guestProfile?.hotel_id && hotelSettings) {
      fullKnowledge = await buildPersonalizedHotelKnowledge(
        hotelSettings, hotelData, weather,
        { ageRange: guestProfile.age_range, groupType: guestProfile.group_type, travelPurpose: guestProfile.travel_purpose },
        guestProfile.hotel_id
      )
    } else {
      fullKnowledge = buildHotelKnowledge(hotelSettings, hotelData, weather)
    }
  } catch {
    fullKnowledge = buildHotelKnowledge(hotelSettings, hotelData, weather)
  }

  const relevantContext = extractRelevantContext(message, fullKnowledge)

  // Stream response as SSE
  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generateResponseStream(message, relevantContext, conversationHistory || [])) {
          fullResponse += chunk
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
        }
        // Append event images after full response is built
        const imageAppendix = appendEventImages('', hotelSettings?.specialEvents || [], fullResponse)
        if (imageAppendix) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: '\n' + imageAppendix })}\n\n`))
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
