import { NextResponse } from 'next/server'

// Shared in-process cache: keyed by "lat,lon", value = { data, expiresAt }
// 30-minute TTL — weather changes slowly; avoids a third-party round-trip on
// every hotel page load.
const weatherCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000

function weatherCodeToDescription(code: number): string {
  const map: Record<number, string> = {
    0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'fog', 51: 'light drizzle', 61: 'slight rain', 63: 'moderate rain',
    65: 'heavy rain', 71: 'slight snow', 80: 'rain showers', 95: 'thunderstorm',
  }
  return map[code] ?? 'unknown'
}

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
    const cw = raw.current_weather

    const weather = {
      temperature:  cw.temperature,
      description:  weatherCodeToDescription(cw.weathercode),
      humidity:     raw.hourly.relative_humidity_2m[0],
      wind_speed:   cw.windspeed,
      feels_like:   cw.temperature + 2,
    }

    weatherCache.set(cacheKey, { data: weather, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(weather)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 502 })
  }
}
