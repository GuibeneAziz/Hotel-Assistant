import { NextResponse } from 'next/server'
import { parseOpenMeteoResponse } from '@/lib/weather'

// Shared in-process cache: keyed by "lat,lon", value = { data, expiresAt }
// 30-minute TTL — weather changes slowly; avoids a third-party round-trip on
// every hotel page load.
const weatherCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  const cacheKey = `${lat},${lon}`
  const cached = weatherCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data)
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true` +
      `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`

    const res = await fetch(url, {
      next: { revalidate: 1800 }, // Next.js data-cache layer (30 min)
    })

    if (!res.ok) throw new Error(`Open-Meteo responded with ${res.status}`)

    const raw = await res.json()
    const weather = parseOpenMeteoResponse(raw)

    weatherCache.set(cacheKey, { data: weather, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(weather)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 502 })
  }
}
