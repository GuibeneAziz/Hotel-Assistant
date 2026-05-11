/**
 * Appends [IMAGE:url] tags for events mentioned in the AI response that have photos.
 * Used by both the HTTP and streaming chat routes.
 */
export function appendEventImages(response: string, events: any[], fullText?: string): string {
  const text = fullText ?? response
  const eventsWithImages = events.filter((e: any) => e.imageUrl)
  if (eventsWithImages.length === 0) return ''

  const textLower = text.toLowerCase()
  const imageTags: string[] = []

  for (const event of eventsWithImages) {
    const titleWords = event.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
    if (titleWords.some((word: string) => textLower.includes(word))) {
      imageTags.push(`[IMAGE:${event.imageUrl}]`)
    }
  }

  return imageTags.join('\n')
}
