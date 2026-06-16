import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit-helper'

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await checkRateLimit(request, 'api')
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { hotelId, reaction } = body

    if (!hotelId || !['positive', 'negative'].includes(reaction)) {
      return NextResponse.json(
        { success: false, error: 'hotelId and reaction (positive|negative) are required' },
        { status: 400 }
      )
    }

    const sentimentCol = reaction === 'positive' ? 'positive_sentiment' : 'negative_sentiment'

    await pool.query(
      `INSERT INTO popular_topics (hotel_id, topic, mention_count, date, positive_sentiment, negative_sentiment)
       VALUES ($1, 'ai_response_satisfaction', 1, CURRENT_DATE, $2, $3)
       ON CONFLICT (hotel_id, topic, date)
       DO UPDATE SET
         mention_count = popular_topics.mention_count + 1,
         ${sentimentCol} = popular_topics.${sentimentCol} + 1`,
      [hotelId, reaction === 'positive' ? 1 : 0, reaction === 'negative' ? 1 : 0]
    )

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

    const startDate = new Date()
    if (timeRange === '1d') startDate.setDate(startDate.getDate() - 1)
    else if (timeRange === '30d') startDate.setDate(startDate.getDate() - 30)
    else startDate.setDate(startDate.getDate() - 7)

    const query = hotelId
      ? `SELECT SUM(positive_sentiment) as positive, SUM(negative_sentiment) as negative
         FROM popular_topics WHERE hotel_id = $1 AND topic = 'ai_response_satisfaction' AND date >= $2`
      : `SELECT SUM(positive_sentiment) as positive, SUM(negative_sentiment) as negative
         FROM popular_topics WHERE topic = 'ai_response_satisfaction' AND date >= $1`

    const params = hotelId ? [hotelId, startDate] : [startDate]
    const result = await pool.query(query, params)

    const positive = parseInt(result.rows[0]?.positive || '0')
    const negative = parseInt(result.rows[0]?.negative || '0')
    const total = positive + negative
    const score = total > 0 ? Math.round((positive / total) * 100) : null

    return NextResponse.json({ success: true, data: { positive, negative, total, score } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
