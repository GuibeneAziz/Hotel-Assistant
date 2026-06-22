import { NextResponse } from 'next/server'
import { trackAiReaction, getAiReactionStats } from '@/lib/analytics'
import { checkRateLimit } from '@/lib/rate-limit-helper'

function resolveHotelId(body: Record<string, unknown>): string | null {
  const raw = body.hotelId ?? body.hotel_id
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return null
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await checkRateLimit(request, 'api')
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const hotelId = resolveHotelId(body)
    const reaction = body.reaction

    if (!hotelId || !['positive', 'negative'].includes(reaction)) {
      return NextResponse.json(
        { success: false, error: 'hotelId and reaction (positive|negative) are required' },
        { status: 400 }
      )
    }

    await trackAiReaction(hotelId, reaction)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Reaction tracking error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await checkRateLimit(request, 'api')
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const timeRange = searchParams.get('timeRange') || '7d'

    const data = await getAiReactionStats(hotelId, timeRange)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Reaction stats error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
