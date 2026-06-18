export interface LiveWeather {
  temperature: number
  description: string
  humidity: number
  wind_speed: number
  feels_like: number
}

const CACHE_TTL_MS = 30 * 60 * 1000

export function weatherCodeToDescription(code: number): string {
  const map: Record<number, string> = {
    0: 'clear sky',
    1: 'mainly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'fog',
    51: 'light drizzle',
    61: 'slight rain',
    63: 'moderate rain',
    65: 'heavy rain',
    71: 'slight snow',
    80: 'rain showers',
    95: 'thunderstorm',
  }
  return map[code] ?? 'unknown'
}

export function parseOpenMeteoResponse(raw: any): LiveWeather {
  const cw = raw.current_weather
  const timeIndex = raw.hourly?.time?.indexOf(cw.time) ?? 0
  const humidity =
    raw.hourly?.relative_humidity_2m?.[timeIndex] ??
    raw.hourly?.relative_humidity_2m?.[0] ??
    0

  return {
    temperature: cw.temperature,
    description: weatherCodeToDescription(cw.weathercode),
    humidity,
    wind_speed: cw.windspeed,
    feels_like: cw.temperature + 2,
  }
}

/** Fetch live weather from Open-Meteo (browser-safe; bypasses Node TLS issues on dev machines). */
export async function fetchLiveWeather(lat: number, lon: number): Promise<LiveWeather> {
  const cacheKey = `weather:${lat},${lon}`

  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as { data: LiveWeather; expiresAt: number }
        if (Date.now() < parsed.expiresAt) return parsed.data
      }
    } catch {
      // Ignore corrupt cache entries
    }
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true` +
    `&hourly=relative_humidity_2m`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo responded with ${res.status}`)

  const weather = parseOpenMeteoResponse(await res.json())

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ data: weather, expiresAt: Date.now() + CACHE_TTL_MS })
      )
    } catch {
      // sessionStorage may be unavailable in private mode
    }
  }

  return weather
}
