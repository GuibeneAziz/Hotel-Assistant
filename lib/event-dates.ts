/** Normalize any event date value to YYYY-MM-DD (timezone-safe). */
export function normalizeEventDate(value: unknown): string | null {
  if (!value) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    if (isoPrefix) return isoPrefix[1]

    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) {
      const [, day, month, year] = dmy
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    const parsed = new Date(trimmed)
    if (Number.isNaN(parsed.getTime())) return null
    return formatDateOnlyUTC(parsed)
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return formatDateOnlyUTC(value)
  }

  return null
}

function formatDateOnlyUTC(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isUpcomingEvent(
  eventDate: string,
  today: string,
  windowDays = 60
): boolean {
  const eventMs = Date.parse(`${eventDate}T00:00:00Z`)
  const todayMs = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(eventMs) || Number.isNaN(todayMs)) return false
  const diffDays = (eventMs - todayMs) / (1000 * 60 * 60 * 24)
  // Today and future only — past events must not appear on the guest chat page
  return diffDays >= 0 && diffDays <= windowDays
}
