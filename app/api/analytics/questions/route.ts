import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit-helper'

export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'api')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const timeRange = searchParams.get('timeRange') || '7d'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
      case '1d':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    const client = await pool.connect()
    
    try {
      const baseWhere = hotelId 
        ? 'WHERE hotel_id = $1 AND date >= $2'
        : 'WHERE date >= $1'
      const params = hotelId ? [hotelId, startDate] : [startDate]

      // Question categories
      const categoryQuery = `
        SELECT category, SUM(question_count) as total 
        FROM question_categories 
        ${baseWhere}
        GROUP BY category 
        ORDER BY total DESC
      `
      const categoryResult = await client.query(categoryQuery, params)
      const questionCategories = categoryResult.rows.map(row => ({
        name: row.category,
        value: parseInt(row.total)
      }))

      // Top subcategories
      const subcategoryQuery = `
        SELECT subcategory, SUM(question_count) as total 
        FROM question_categories 
        ${baseWhere}
        GROUP BY subcategory 
        ORDER BY total DESC 
        LIMIT 10
      `
      const subcategoryResult = await client.query(subcategoryQuery, params)
      const topSubcategories = subcategoryResult.rows.map(row => ({
        name: row.subcategory,
        value: parseInt(row.total)
      }))

      // Questions over time (daily)
      const timeQuery = `
        SELECT date, SUM(question_count) as total 
        FROM question_categories 
        ${baseWhere}
        GROUP BY date 
        ORDER BY date ASC
      `
      const timeResult = await client.query(timeQuery, params)
      const questionsOverTime = timeResult.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        questions: parseInt(row.total)
      }))

      // Real peak hours from guest_profiles.last_visit timestamps
      const peakHoursQuery = hotelId
        ? `SELECT EXTRACT(HOUR FROM last_visit)::int AS hour, COUNT(*) AS interactions
           FROM guest_profiles WHERE hotel_id = $1 AND last_visit >= $2
           GROUP BY hour ORDER BY hour`
        : `SELECT EXTRACT(HOUR FROM last_visit)::int AS hour, COUNT(*) AS interactions
           FROM guest_profiles WHERE last_visit >= $1
           GROUP BY hour ORDER BY hour`
      const peakHoursResult = await client.query(peakHoursQuery, params)
      const hoursMap: Record<number, number> = {}
      for (const row of peakHoursResult.rows) {
        hoursMap[row.hour] = parseInt(row.interactions)
      }
      const peakHours = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        interactions: hoursMap[hour] ?? 0,
      }))

      // Popular topics
      const topicsQuery = hotelId
        ? `SELECT topic, SUM(mention_count) AS total FROM popular_topics
           WHERE hotel_id = $1 AND date >= $2
           GROUP BY topic ORDER BY total DESC LIMIT 12`
        : `SELECT topic, SUM(mention_count) AS total FROM popular_topics
           WHERE date >= $1
           GROUP BY topic ORDER BY total DESC LIMIT 12`
      const topicsResult = await client.query(topicsQuery, params)
      const popularTopics = topicsResult.rows.map(row => ({
        name: row.topic.replace(/_/g, ' '),
        value: parseInt(row.total),
      }))

      return NextResponse.json({
        success: true,
        data: {
          questionCategories,
          topSubcategories,
          questionsOverTime,
          peakHours,
          popularTopics,
        }
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