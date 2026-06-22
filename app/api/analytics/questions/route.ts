import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { aggregateTopicCounts } from '@/lib/question-classifier'
import { checkRateLimit } from '@/lib/rate-limit-helper'

const EXCLUDED_TOPICS = ['ai_response_satisfaction', 'general', 'general_inquiry']

function timeRangeToInterval(timeRange: string): string {
  if (timeRange === '1d') return '1 day'
  if (timeRange === '30d') return '30 days'
  return '7 days'
}

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await checkRateLimit(request, 'api')
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const timeRange = searchParams.get('timeRange') || '7d'
    const interval = timeRangeToInterval(timeRange)

    const client = await pool.connect()

    try {
      const peakHoursParams = hotelId ? [hotelId, interval] : [interval]
      const topicParams = hotelId ? [hotelId, interval] : [interval]

      const peakHoursQuery = hotelId
        ? `SELECT EXTRACT(HOUR FROM last_visit)::int AS hour, COUNT(*) AS interactions
           FROM guest_profiles
           WHERE hotel_id = $1 AND last_visit >= NOW() - $2::interval
           GROUP BY hour ORDER BY hour`
        : `SELECT EXTRACT(HOUR FROM last_visit)::int AS hour, COUNT(*) AS interactions
           FROM guest_profiles
           WHERE last_visit >= NOW() - $1::interval
           GROUP BY hour ORDER BY hour`

      const topicsQuery = hotelId
        ? `SELECT topic, SUM(mention_count) AS total
           FROM popular_topics
           WHERE hotel_id = $1
             AND date >= CURRENT_DATE - $2::interval
             AND topic <> ALL($3::text[])
           GROUP BY topic
           ORDER BY total DESC
           LIMIT 12`
        : `SELECT topic, SUM(mention_count) AS total
           FROM popular_topics
           WHERE date >= CURRENT_DATE - $1::interval
             AND topic <> ALL($2::text[])
           GROUP BY topic
           ORDER BY total DESC
           LIMIT 12`

      const timeQuery = hotelId
        ? `SELECT date, SUM(mention_count) AS total
           FROM popular_topics
           WHERE hotel_id = $1
             AND date >= CURRENT_DATE - $2::interval
             AND topic <> ALL($3::text[])
           GROUP BY date
           ORDER BY date ASC`
        : `SELECT date, SUM(mention_count) AS total
           FROM popular_topics
           WHERE date >= CURRENT_DATE - $1::interval
             AND topic <> ALL($2::text[])
           GROUP BY date
           ORDER BY date ASC`

      const [peakHoursResult, topicsResult, timeResult] = await Promise.all([
        client.query(peakHoursQuery, peakHoursParams),
        client.query(
          topicsQuery,
          hotelId ? [hotelId, interval, EXCLUDED_TOPICS] : [interval, EXCLUDED_TOPICS]
        ),
        client.query(
          timeQuery,
          hotelId ? [hotelId, interval, EXCLUDED_TOPICS] : [interval, EXCLUDED_TOPICS]
        ),
      ])

      const hoursMap: Record<number, number> = {}
      for (const row of peakHoursResult.rows) {
        hoursMap[row.hour] = parseInt(row.interactions, 10)
      }
      const peakHours = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        interactions: hoursMap[hour] ?? 0,
      }))

      const popularTopics = aggregateTopicCounts(
        topicsResult.rows.map((row) => ({ topic: row.topic, total: row.total })),
        EXCLUDED_TOPICS
      ).slice(0, 12)

      const questionsOverTime = timeResult.rows.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        questions: parseInt(row.total, 10),
      }))

      return NextResponse.json({
        success: true,
        data: {
          questionsOverTime,
          peakHours,
          popularTopics,
        },
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Analytics questions error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions data' },
      { status: 500 }
    )
  }
}
