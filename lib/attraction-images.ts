/** Verified or category fallback images when DB image_url is missing or broken. */

const BROKEN_URL_FRAGMENTS = [
  'Hammamet_beach_Tunisia.jpg',
  '9/98/Hammamet',
  'Aqua_Palace_Hammamet.jpg',
  '2/28/Aqua',
]

const CATEGORY_FALLBACKS: Record<string, string> = {
  nature:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Hammamet_Medina.JPG/960px-Hammamet_Medina.JPG',
  cultural:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hammamet_Kasbah.jpg/960px-Hammamet_Kasbah.jpg',
  adventure:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hammamet_Kasbah.jpg/960px-Hammamet_Kasbah.jpg',
  entertainment:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Hammamet_Medina.JPG/960px-Hammamet_Medina.JPG',
  shopping:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Hammamet_Medina.JPG/960px-Hammamet_Medina.JPG',
  restaurant:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/800px-A_small_cup_of_coffee.JPG',
  cafe:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Coffee_with_milk_%2866385606%29.jpg/800px-Coffee_with_milk_%2866385606%29.jpg',
}

/** Per-attraction overrides (hotel_id + name). */
const ATTRACTION_OVERRIDES: Record<string, string> = {
  'sindbad-hammamet::Hammamet Main Beach':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Hammamet_Medina.JPG/960px-Hammamet_Medina.JPG',
  'sindbad-hammamet::Yasmine Beach Strip':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hammamet_Kasbah.jpg/960px-Hammamet_Kasbah.jpg',
  'sindbad-hammamet::Cap Bon Coastal Walk':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Kasbah_Hammamet.jpg/800px-Kasbah_Hammamet.jpg',
  'sindbad-hammamet::Hammamet Medina':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Hammamet_Medina.JPG/960px-Hammamet_Medina.JPG',
  'sindbad-hammamet::Hammamet Kasbah':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hammamet_Kasbah.jpg/960px-Hammamet_Kasbah.jpg',
  'sindbad-hammamet::Café de la Plage — Beachfront':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/800px-A_small_cup_of_coffee.JPG',
  'sindbad-hammamet::Café Sidi Bou Hadid — Historic':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Mint_tea_in_Tunisia.jpg/800px-Mint_tea_in_Tunisia.jpg',
  'sindbad-hammamet::Marina Coffee Lounge':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Coffee_with_milk_%2866385606%29.jpg/800px-Coffee_with_milk_%2866385606%29.jpg',
  'sindbad-hammamet::Café El Hana — Traditional Courtyard':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Turkish_coffee_in_Tunisia.jpg/800px-Turkish_coffee_in_Tunisia.jpg',
}

function overrideKey(hotelId: string | undefined, name: string | undefined): string {
  return `${hotelId || ''}::${name || ''}`
}

function isBrokenImageUrl(url: string): boolean {
  return BROKEN_URL_FRAGMENTS.some((fragment) => url.includes(fragment))
}

/** Resolve a displayable image URL for an attraction (DB → override → category). */
export function getAttractionImageUrl(attraction: {
  hotel_id?: string
  attraction_name?: string
  category?: string
  image_url?: string | null
}): string | null {
  const dbUrl = attraction.image_url?.trim()
  if (dbUrl && !isBrokenImageUrl(dbUrl)) {
    return dbUrl
  }

  const key = overrideKey(attraction.hotel_id, attraction.attraction_name)
  if (ATTRACTION_OVERRIDES[key]) {
    return ATTRACTION_OVERRIDES[key]
  }

  const category = (attraction.category || '').toLowerCase()
  if (category && CATEGORY_FALLBACKS[category]) {
    return CATEGORY_FALLBACKS[category]
  }

  return CATEGORY_FALLBACKS.nature
}

export function buildAttractionImageTag(attraction: {
  attraction_name: string
  hotel_id?: string
  category?: string
  image_url?: string | null
}): string | null {
  const url = getAttractionImageUrl(attraction)
  if (!url) return null
  return `[IMAGE:${attraction.attraction_name}|${url}]`
}
