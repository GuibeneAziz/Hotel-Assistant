import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit-helper'

// Canonical nationality names and their common misspellings/variations
const NATIONALITY_MAP: Record<string, string> = {
  // French
  french: 'French', francais: 'French', française: 'French', francaise: 'French',
  frech: 'French', frnch: 'French', fench: 'French', freanch: 'French', frensh: 'French',
  france: 'French', frnech: 'French', frenc: 'French',
  // German
  german: 'German', deutsch: 'German', grman: 'German', geman: 'German',
  germn: 'German', germa: 'German', germany: 'German', germen: 'German',
  // American
  american: 'American', americain: 'American', amercian: 'American', amercan: 'American',
  usa: 'American', 'us': 'American', amerikan: 'American', amrican: 'American',
  // British
  british: 'British', english: 'British', britsh: 'British', birtish: 'British',
  uk: 'British', briish: 'British', brittish: 'British',
  // Italian
  italian: 'Italian', italien: 'Italian', italain: 'Italian', itlian: 'Italian',
  italiano: 'Italian', itaian: 'Italian', itallian: 'Italian',
  // Spanish
  spanish: 'Spanish', espagnol: 'Spanish', spansh: 'Spanish', spainsh: 'Spanish',
  spansih: 'Spanish', spain: 'Spanish',
  // Turkish
  turkish: 'Turkish', turc: 'Turkish', turksh: 'Turkish', tukish: 'Turkish',
  turksih: 'Turkish', turkey: 'Turkish',
  // Tunisian
  tunisian: 'Tunisian', tunisien: 'Tunisian', tunisain: 'Tunisian', tunisien: 'Tunisian',
  tunisia: 'Tunisian', tunsian: 'Tunisian',
  // Russian
  russian: 'Russian', russe: 'Russian', rusian: 'Russian', russain: 'Russian',
  russia: 'Russian',
  // Chinese
  chinese: 'Chinese', chinois: 'Chinese', chinse: 'Chinese', chineese: 'Chinese',
  china: 'Chinese',
  // Japanese
  japanese: 'Japanese', japonais: 'Japanese', japnese: 'Japanese', japanse: 'Japanese',
  japan: 'Japanese',
  // Dutch
  dutch: 'Dutch', néerlandais: 'Dutch', neerlandais: 'Dutch', dutsh: 'Dutch',
  netherlands: 'Dutch', holland: 'Dutch',
  // Belgian
  belgian: 'Belgian', belge: 'Belgian', belgain: 'Belgian', belgium: 'Belgian',
  // Swiss
  swiss: 'Swiss', suisse: 'Swiss', swis: 'Swiss', switzerland: 'Swiss',
  // Canadian
  canadian: 'Canadian', canadien: 'Canadian', canadin: 'Canadian', canada: 'Canadian',
  // Australian
  australian: 'Australian', australien: 'Australian', australan: 'Australian', australia: 'Australian',
  // Polish
  polish: 'Polish', polonais: 'Polish', polsih: 'Polish', poland: 'Polish',
  // Algerian
  algerian: 'Algerian', algérien: 'Algerian', algerien: 'Algerian', algeria: 'Algerian',
  // Moroccan
  moroccan: 'Moroccan', marocain: 'Moroccan', morrocan: 'Moroccan', morocco: 'Moroccan',
  // Libyan
  libyan: 'Libyan', libyen: 'Libyan', libya: 'Libyan',
  // Egyptian
  egyptian: 'Egyptian', égyptien: 'Egyptian', egyptien: 'Egyptian', egypt: 'Egyptian',
}

function normalizeNationality(raw: string): string {
  if (!raw) return 'Unknown'
  const key = raw.trim().toLowerCase()
  if (NATIONALITY_MAP[key]) return NATIONALITY_MAP[key]
  
  // Fuzzy match: find the closest key using Levenshtein distance
  let bestMatch = ''
  let bestDist = Infinity
  for (const candidate of Object.keys(NATIONALITY_MAP)) {
    const d = levenshtein(key, candidate)
    if (d < bestDist) {
      bestDist = d
      bestMatch = candidate
    }
  }
  // Accept if edit distance <= 2 (covers most typos)
  if (bestDist <= 2 && bestMatch) return NATIONALITY_MAP[bestMatch]
  
  // Capitalize first letter as fallback
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase()
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

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
        ? 'WHERE hotel_id = $1 AND first_visit >= $2'
        : 'WHERE first_visit >= $1'
      const params = hotelId ? [hotelId, startDate] : [startDate]

      // Run all 4 aggregate queries in parallel
      const [ageResult, nationalityResult, purposeResult, groupResult] = await Promise.all([
        client.query(
          `SELECT age_range, COUNT(*) as count FROM guest_profiles ${baseWhere} GROUP BY age_range ORDER BY count DESC`,
          params
        ),
        client.query(
          `SELECT nationality, COUNT(*) as count FROM guest_profiles ${baseWhere} GROUP BY nationality ORDER BY count DESC`,
          params
        ),
        client.query(
          `SELECT travel_purpose, COUNT(*) as count FROM guest_profiles ${baseWhere} GROUP BY travel_purpose ORDER BY count DESC`,
          params
        ),
        client.query(
          `SELECT group_type, COUNT(*) as count FROM guest_profiles ${baseWhere} GROUP BY group_type ORDER BY count DESC`,
          params
        ),
      ])

      const ageDistribution = ageResult.rows.map(row => ({
        name: row.age_range,
        value: parseInt(row.count),
        percentage: 0,
      }))
      const totalGuests = ageDistribution.reduce((sum, item) => sum + item.value, 0)
      ageDistribution.forEach(item => {
        item.percentage = totalGuests > 0 ? Math.round((item.value / totalGuests) * 100) : 0
      })

      const nationalityMerged = new Map<string, number>()
      for (const row of nationalityResult.rows) {
        const normalized = normalizeNationality(row.nationality)
        nationalityMerged.set(normalized, (nationalityMerged.get(normalized) || 0) + parseInt(row.count))
      }
      const topNationalities = Array.from(nationalityMerged.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

      const travelPurposes = purposeResult.rows.map(row => ({
        name: row.travel_purpose,
        value: parseInt(row.count),
      }))

      const groupTypes = groupResult.rows.map(row => ({
        name: row.group_type,
        value: parseInt(row.count),
      }))

      return NextResponse.json({
        success: true,
        data: {
          ageDistribution,
          topNationalities,
          travelPurposes,
          groupTypes,
          totalGuests
        }
      })

    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Analytics demographics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch demographics data' },
      { status: 500 }
    )
  }
}