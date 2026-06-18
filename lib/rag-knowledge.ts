// RAG Knowledge Base Builder
// Converts hotel data into structured knowledge for AI

import { buildClusteredAttractionsContext, parseWeatherConditions, type ClusteringGuestProfile, type ClusteringWeather } from './attraction-clustering'
import { normalizeEventDate } from './event-dates'

function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isDateOrEventQuery(queryLower: string): boolean {
  return /\b(event|events|today|tomorrow|tonight|weekend|week|date|calendar|schedule|when|happening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(queryLower)
    || /\b\d{4}-\d{2}-\d{2}\b/.test(queryLower)
    || /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(queryLower)
}

function splitKnowledgeSections(fullKnowledge: string): Array<{ header: string; lines: string[] }> {
  const sections: Array<{ header: string; lines: string[] }> = []
  let currentSection: { header: string; lines: string[] } | null = null

  for (const line of fullKnowledge.split('\n')) {
    if (line.startsWith('===')) {
      if (currentSection) sections.push(currentSection)
      currentSection = { header: line, lines: [line] }
      continue
    }

    if (!currentSection) {
      currentSection = { header: '', lines: [] }
    }

    currentSection.lines.push(line)
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

export function buildHotelKnowledge(
  hotelSettings: any,
  hotelData: any,
  weather: any,
  guestProfile?: ClusteringGuestProfile
): string {
  const knowledge: string[] = []

  // Contact Information (Move to top for easy reference)
  knowledge.push(`=== CONTACT INFORMATION ===`)
  if (hotelSettings?.contact) {
    if (hotelSettings.contact.phone) {
      knowledge.push(`Front Desk Phone: ${hotelSettings.contact.phone}`)
    }
    if (hotelSettings.contact.email) {
      knowledge.push(`Email: ${hotelSettings.contact.email}`)
    }
    if (hotelSettings.contact.emergencyPhone) {
      knowledge.push(`Emergency Phone: ${hotelSettings.contact.emergencyPhone}`)
    }
  } else {
    // Fallback contact info if not in settings
    knowledge.push(`Front Desk Phone: Available at reception`)
    knowledge.push(`Email: Available at reception`)
  }
  knowledge.push(`
IMPORTANT: For bookings, reservations, or any services that require action, guests must contact the front desk directly.
The AI assistant can ONLY provide information, not make bookings or arrangements.`)
  knowledge.push('')

  // Hotel Basic Information
  if (hotelData) {
    knowledge.push(`=== HOTEL INFORMATION ===`)
    knowledge.push(`Name: ${hotelData.name}`)
    knowledge.push(`Location: ${hotelData.location}`)
    knowledge.push(`Description: ${hotelData.description}`)
    knowledge.push('')
  }

  // Facilities
  knowledge.push(`=== FACILITIES ===`)
  
  if (hotelSettings?.pool) {
    const status = hotelSettings.pool.available ? 'OPEN' : 'CLOSED'
    knowledge.push(`Pool: ${status}`)
    if (hotelSettings.pool.available) {
      knowledge.push(`  Hours: ${hotelSettings.pool.openTime} - ${hotelSettings.pool.closeTime}`)
    }
    if (hotelSettings.pool.barOpenTime && hotelSettings.pool.barCloseTime) {
      knowledge.push(`Infinity Bar (pool bar): OPEN`)
      knowledge.push(`  Hours: ${hotelSettings.pool.barOpenTime} - ${hotelSettings.pool.barCloseTime}`)
      knowledge.push(`  Menu: not available in this system — guests must ask the front desk for the drink menu`)
    }
  }

  if (hotelSettings?.gym) {
    const status = hotelSettings.gym.available ? 'OPEN' : 'CLOSED'
    knowledge.push(`Gym/Fitness Center: ${status}`)
    if (hotelSettings.gym.available) {
      knowledge.push(`  Hours: ${hotelSettings.gym.openTime} - ${hotelSettings.gym.closeTime}`)
    }
  }

  if (hotelSettings?.spa) {
    const status = hotelSettings.spa.available ? 'OPEN' : 'CLOSED'
    knowledge.push(`Spa: ${status}`)
    if (hotelSettings.spa.available) {
      knowledge.push(`  Hours: ${hotelSettings.spa.openTime} - ${hotelSettings.spa.closeTime}`)
      if (hotelSettings.spa.treatments?.length > 0) {
        knowledge.push(`  Treatments: ${hotelSettings.spa.treatments.join(', ')}`)
      }
    }
  }

  if (hotelSettings?.kidsClub) {
    const status = hotelSettings.kidsClub.available ? 'OPEN' : 'CLOSED'
    knowledge.push(`Kids Club: ${status}`)
    if (hotelSettings.kidsClub.available) {
      knowledge.push(`  Hours: ${hotelSettings.kidsClub.openTime} - ${hotelSettings.kidsClub.closeTime}`)
      knowledge.push(`  Age Range: ${hotelSettings.kidsClub.ageRange}`)
    }
  }

  knowledge.push('')

  // Restaurant Schedule
  if (hotelSettings?.restaurant) {
    knowledge.push(`=== RESTAURANT SCHEDULE ===`)
    const { breakfast, lunch, dinner } = hotelSettings.restaurant
    
    if (breakfast?.available) {
      knowledge.push(`Breakfast: OPEN ${breakfast.start} - ${breakfast.end}`)
    } else {
      knowledge.push(`Breakfast: CURRENTLY CLOSED`)
    }
    
    if (lunch?.available) {
      knowledge.push(`Lunch: OPEN ${lunch.start} - ${lunch.end}`)
    } else {
      knowledge.push(`Lunch: CURRENTLY CLOSED`)
    }
    
    if (dinner?.available) {
      knowledge.push(`Dinner: OPEN ${dinner.start} - ${dinner.end}`)
    } else {
      knowledge.push(`Dinner: CURRENTLY CLOSED`)
    }
    knowledge.push('')
  }

  // Special Events
  knowledge.push(`=== SPECIAL EVENTS ===`)
  if (hotelSettings?.specialEvents?.length > 0) {
    const today = formatDateOnly(new Date())
    const normalizedEvents = hotelSettings.specialEvents.map((event: any) => ({
      ...event,
      normalizedDate: normalizeEventDate(event.date),
    }))
    
    // Today's events
    const todayEvents = normalizedEvents.filter((event: any) => event.normalizedDate === today)
    if (todayEvents.length > 0) {
      knowledge.push(`TODAY'S EVENTS:`)
      todayEvents.forEach((event: any) => {
        knowledge.push(`  - ${event.title}`)
        knowledge.push(`    Time: ${event.time}`)
        knowledge.push(`    Location: ${event.location}`)
        knowledge.push(`    Price: ${event.price || 'Free'}`)
        if (event.description) {
          knowledge.push(`    Details: ${event.description}`)
        }
      })
    }
    
    // Upcoming events
    const upcomingEvents = normalizedEvents
      .filter((event: any) => event.normalizedDate && event.normalizedDate > today)
      .slice(0, 5)
    
    if (upcomingEvents.length > 0) {
      knowledge.push(`UPCOMING EVENTS:`)
      upcomingEvents.forEach((event: any) => {
        knowledge.push(`  - ${event.title} on ${event.normalizedDate}`)
        knowledge.push(`    Time: ${event.time}, Location: ${event.location}`)
        knowledge.push(`    Price: ${event.price || 'Free'}`)
        if (event.description) {
          knowledge.push(`    Details: ${event.description}`)
        }
      })
    }

    if (todayEvents.length === 0 && upcomingEvents.length === 0) {
      const activeEvents = normalizedEvents.filter(
        (event: any) => event.normalizedDate && event.normalizedDate >= today
      )
      if (activeEvents.length > 0) {
        knowledge.push(`ALL SCHEDULED EVENTS:`)
        activeEvents.slice(0, 5).forEach((event: any) => {
          knowledge.push(`  - ${event.title}${event.normalizedDate ? ` on ${event.normalizedDate}` : ''}`)
          if (event.time) {
            knowledge.push(`    Time: ${event.time}`)
          }
          if (event.location) {
            knowledge.push(`    Location: ${event.location}`)
          }
          knowledge.push(`    Price: ${event.price || 'Free'}`)
          if (event.description) {
            knowledge.push(`    Details: ${event.description}`)
          }
        })
      }
    }
  } else {
    knowledge.push(`No special events are currently scheduled.`)
    knowledge.push(`For information about upcoming events, please contact the front desk.`)
  }
  knowledge.push('')

  // Hotel Activities (from database)
  if (hotelSettings?.hotelActivities && hotelSettings.hotelActivities.length > 0) {
    knowledge.push(`=== HOTEL ACTIVITIES (INSIDE THE HOTEL) ===`)
    
    // Group by category
    const byCategory: { [key: string]: any[] } = {}
    hotelSettings.hotelActivities.forEach((activity: any) => {
      if (!byCategory[activity.category]) {
        byCategory[activity.category] = []
      }
      byCategory[activity.category].push(activity)
    })
    
    Object.entries(byCategory).forEach(([category, activities]) => {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1)
      knowledge.push(`\n${categoryName} Activities:`)
      activities.forEach((activity: any) => {
        knowledge.push(`  - ${activity.activity_name}`)
        if (activity.description) {
          knowledge.push(`    ${activity.description}`)
        }
        if (activity.location) {
          knowledge.push(`    Location: ${activity.location}`)
        }
      })
    })
    knowledge.push('')
  }

  // Nearby Attractions (from database - personalized if guest profile available)
  if (hotelSettings?.nearbyAttractions && hotelSettings.nearbyAttractions.length > 0) {
    knowledge.push(`=== NEARBY ATTRACTIONS (OUTSIDE THE HOTEL) ===`)
    knowledge.push(`IMPORTANT: These are the ONLY nearby attractions available. Do not suggest any attractions not listed here.`)
    knowledge.push(`If a guest asks about attractions not in this list, politely explain that you can only provide information about the attractions listed below.`)
    knowledge.push('')
    
    // Group by category
    const byCategory: { [key: string]: any[] } = {}
    hotelSettings.nearbyAttractions.forEach((attraction: any) => {
      if (!byCategory[attraction.category]) {
        byCategory[attraction.category] = []
      }
      byCategory[attraction.category].push(attraction)
    })
    
    Object.entries(byCategory).forEach(([category, attractions]) => {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1)
      knowledge.push(`\n${categoryName} Attractions:`)
      attractions.forEach((attraction: any) => {
        knowledge.push(`  - ${attraction.attraction_name}`)
        if (attraction.description) {
          knowledge.push(`    ${attraction.description}`)
        }
        if (attraction.distance) {
          knowledge.push(`    Distance: ${attraction.distance}`)
        }
        if (attraction.estimated_duration) {
          knowledge.push(`    Duration: ${attraction.estimated_duration}`)
        }
        if (attraction.price_range) {
          knowledge.push(`    Price: ${attraction.price_range}`)
        }
        if (attraction.transportation) {
          knowledge.push(`    Transportation: ${attraction.transportation}`)
        }
        // Add personalization info if available
        if (attraction.match_score !== undefined) {
          knowledge.push(`    Recommended for your travel style (${attraction.match_score}% match)`)
        }
        if (attraction.weather_suitable !== undefined) {
          const weatherNote = attraction.weather_suitable 
            ? "Perfect for current weather conditions" 
            : "Better suited for different weather conditions"
          knowledge.push(`    Weather: ${weatherNote}`)
        }
      })
    })
    knowledge.push('')
    knowledge.push(`STRICT RULE: Only recommend attractions from the above list. Never suggest attractions not listed here.`)
    knowledge.push('')
  } else {
    knowledge.push(`=== NEARBY ATTRACTIONS ===`)
    knowledge.push(`No nearby attractions are currently available in our database.`)
    knowledge.push(`Please contact the front desk for information about local attractions and activities.`)
    knowledge.push('')
  }

  // Amenities
  knowledge.push(`=== AMENITIES ===`)
  
  if (hotelSettings?.wifi?.available) {
    knowledge.push(`WiFi: Available`)
    if (hotelSettings.wifi.password) {
      knowledge.push(`  Password: ${hotelSettings.wifi.password}`)
    }
    if (hotelSettings.wifi.instructions) {
      knowledge.push(`  Instructions: ${hotelSettings.wifi.instructions}`)
    }
  }

  if (hotelSettings?.parking?.available) {
    knowledge.push(`Parking: Available`)
    if (hotelSettings.parking.price) {
      knowledge.push(`  Price: ${hotelSettings.parking.price}`)
    }
    if (hotelSettings.parking.instructions) {
      knowledge.push(`  Details: ${hotelSettings.parking.instructions}`)
    }
  }

  knowledge.push('')

  // Check-in/Check-out
  knowledge.push(`=== CHECK-IN/CHECK-OUT ===`)
  if (hotelSettings?.checkIn) {
    knowledge.push(`Check-in: ${hotelSettings.checkIn.time}`)
    if (hotelSettings.checkIn.instructions) {
      knowledge.push(`  ${hotelSettings.checkIn.instructions}`)
    }
  }
  if (hotelSettings?.checkOut) {
    knowledge.push(`Check-out: ${hotelSettings.checkOut.time}`)
    if (hotelSettings.checkOut.instructions) {
      knowledge.push(`  ${hotelSettings.checkOut.instructions}`)
    }
  }
  knowledge.push('')

  // Weather Information
  if (weather) {
    knowledge.push(`=== CURRENT WEATHER ===`)
    knowledge.push(`Temperature: ${weather.temperature}°C (feels like ${weather.feels_like ?? weather.temperature}°C)`)
    knowledge.push(`Conditions: ${weather.description}`)
    knowledge.push(`Humidity: ${weather.humidity ?? 'N/A'}%`)
    knowledge.push(`Wind Speed: ${weather.wind_speed ?? 0} km/h`)
    
    // Explicit weather directive for indoor/outdoor guidance
    const desc = (weather.description ?? '').toLowerCase()
    const isRainy = desc.includes('rain') || desc.includes('shower') || desc.includes('drizzle')
    const isWindy = (weather.wind_speed ?? 0) > 20
    const temp    = weather.temperature ?? 25

    if (isRainy) {
      knowledge.push(`Weather Directive: ⛈️ RAINY today — recommend indoor activities (spa, gym, cafés, museums, restaurants). Outdoor/pool activities are discouraged.`)
    } else if (isWindy) {
      knowledge.push(`Weather Directive: 💨 WINDY today — prefer sheltered venues. Outdoor activities are possible but may be uncomfortable.`)
    } else if (temp >= 35) {
      knowledge.push(`Weather Directive: ☀️ VERY HOT (${temp}°C) — suggest early-morning or evening outdoor activities. Air-conditioned indoor venues are comfortable alternatives.`)
    } else if (temp >= 22) {
      knowledge.push(`Weather Directive: 🌤️ IDEAL WEATHER (${temp}°C) — perfect for outdoor activities, pool, beach, and nature visits.`)
    } else {
      knowledge.push(`Weather Directive: 🌥️ COOL (${temp}°C) — indoor cafés, cultural sites, and restaurants are especially appealing.`)
    }
    knowledge.push('')
  }

  return knowledge.join('\n')
}

// Helper function to extract relevant context based on query
export function extractRelevantContext(query: string, fullKnowledge: string): string {
  const queryLower = query.toLowerCase()
  
  // Keywords to section mapping
  const keywords: { [key: string]: string[] } = {
    'pool': ['FACILITIES'],
    'gym': ['FACILITIES'],
    'fitness': ['FACILITIES'],
    'spa': ['FACILITIES'],
    // Restaurant/food words cover BOTH the hotel meal schedule and nearby
    // restaurant/cafe attractions, since guests may mean either one.
    'restaurant': ['RESTAURANT SCHEDULE', 'NEARBY ATTRACTIONS'],
    'restaurants': ['RESTAURANT SCHEDULE', 'NEARBY ATTRACTIONS'],
    'breakfast': ['RESTAURANT SCHEDULE'],
    'lunch': ['RESTAURANT SCHEDULE'],
    'dinner': ['RESTAURANT SCHEDULE', 'NEARBY ATTRACTIONS'],
    'eat': ['RESTAURANT SCHEDULE', 'NEARBY ATTRACTIONS'],
    'food': ['RESTAURANT SCHEDULE', 'NEARBY ATTRACTIONS'],
    'dining': ['RESTAURANT SCHEDULE', 'NEARBY ATTRACTIONS'],
    'dine': ['RESTAURANT SCHEDULE', 'NEARBY ATTRACTIONS'],
    'cafe': ['NEARBY ATTRACTIONS'],
    'café': ['NEARBY ATTRACTIONS'],
    'coffee': ['NEARBY ATTRACTIONS'],
    'bar': ['FACILITIES'],
    'cocktail': ['FACILITIES'],
    'drinks': ['FACILITIES'],
    'shopping': ['NEARBY ATTRACTIONS'],
    'shop': ['NEARBY ATTRACTIONS'],
    'beach': ['NEARBY ATTRACTIONS'],
    'museum': ['NEARBY ATTRACTIONS'],
    'park': ['NEARBY ATTRACTIONS'],
    'culture': ['NEARBY ATTRACTIONS'],
    'cultural': ['NEARBY ATTRACTIONS'],
    'nature': ['NEARBY ATTRACTIONS'],
    'entertainment': ['NEARBY ATTRACTIONS'],
    'adventure': ['NEARBY ATTRACTIONS'],
    'event': ['SPECIAL EVENTS'],
    'events': ['SPECIAL EVENTS'],
    'activity': ['ACTIVITIES', 'HOTEL ACTIVITIES', 'NEARBY ATTRACTIONS'],
    'activities': ['ACTIVITIES', 'HOTEL ACTIVITIES', 'NEARBY ATTRACTIONS'],
    'nearby': ['NEARBY ATTRACTIONS'],
    'attraction': ['NEARBY ATTRACTIONS'],
    'attractions': ['NEARBY ATTRACTIONS'],
    'things to do': ['HOTEL ACTIVITIES', 'NEARBY ATTRACTIONS'],
    'visit': ['NEARBY ATTRACTIONS'],
    'see': ['NEARBY ATTRACTIONS'],
    'explore': ['NEARBY ATTRACTIONS'],
    'outside': ['NEARBY ATTRACTIONS'],
    'around': ['NEARBY ATTRACTIONS'],
    'area': ['NEARBY ATTRACTIONS'],
    'local': ['NEARBY ATTRACTIONS'],
    'wifi': ['AMENITIES'],
    'parking': ['AMENITIES'],
    'check': ['CHECK-IN/CHECK-OUT'],
    'contact': ['CONTACT INFORMATION'],
    'weather': ['CURRENT WEATHER'],
    // Common French keywords (app is heavily used in French)
    'proximité': ['NEARBY ATTRACTIONS'],
    'autour': ['NEARBY ATTRACTIONS'],
    'visiter': ['NEARBY ATTRACTIONS'],
    'manger': ['RESTAURANT SCHEDULE', 'NEARBY ATTRACTIONS'],
    'plage': ['NEARBY ATTRACTIONS'],
    'musée': ['NEARBY ATTRACTIONS'],
    'musee': ['NEARBY ATTRACTIONS'],
    'parc': ['NEARBY ATTRACTIONS'],
    'activité': ['ACTIVITIES', 'HOTEL ACTIVITIES', 'NEARBY ATTRACTIONS'],
    'activités': ['ACTIVITIES', 'HOTEL ACTIVITIES', 'NEARBY ATTRACTIONS'],
    'météo': ['CURRENT WEATHER'],
  }
  
  // Find relevant sections
  const relevantHeaders = new Set<string>()
  for (const [keyword, sections] of Object.entries(keywords)) {
    if (queryLower.includes(keyword)) {
      sections.forEach((section) => relevantHeaders.add(section))
    }
  }

  if (isDateOrEventQuery(queryLower)) {
    relevantHeaders.add('SPECIAL EVENTS')
  }
  
  // If no specific keywords, return full knowledge
  if (relevantHeaders.size === 0) {
    return fullKnowledge
  }
  
  const essentialHeaders = ['CONTACT INFORMATION', 'HOTEL INFORMATION']
  const relevantSections = splitKnowledgeSections(fullKnowledge).filter((section) => {
    const header = section.header.replace(/=/g, '').trim()
    return essentialHeaders.some((essentialHeader) => header.includes(essentialHeader))
      || Array.from(relevantHeaders).some((relevantHeader) => header.includes(relevantHeader))
  })

  const relevantContext = relevantSections
    .map((section) => section.lines.join('\n').trimEnd())
    .filter(Boolean)
    .join('\n\n')

  if (isDateOrEventQuery(queryLower) && !relevantContext.includes('=== SPECIAL EVENTS ===')) {
    return fullKnowledge
  }
  
  return relevantContext || fullKnowledge
}

/**
 * Build personalized hotel knowledge using K-Means Prototype Clustering.
 *
 * The guest profile is encoded into a 3-D feature vector and assigned to the
 * nearest cluster centroid (one of 5 travel personas). Attractions are then
 * scored by category affinity weights defined for that cluster, adjusted by a
 * weather modifier and a distance penalty. Only the top-ranked results are
 * injected into the LLM context, preventing the AI from listing everything.
 */
export async function buildPersonalizedHotelKnowledge(
  hotelSettings: any,
  hotelData: any,
  weather: any,
  guestProfile: ClusteringGuestProfile,
  hotelId: string
): Promise<string> {
  const clusteringWeather: ClusteringWeather = parseWeatherConditions(weather)

  // Build a guest context header so the AI always knows who it's talking to
  const groupLabels: Record<string, string> = {
    solo: 'solo traveller', couple: 'couple', family: 'family with children', group: 'group',
  }
  const purposeLabels: Record<string, string> = {
    leisure: 'leisure trip', business: 'business trip', family: 'family trip', honeymoon: 'honeymoon',
  }
  const guestContextHeader = [
    `=== CURRENT GUEST PROFILE ===`,
    `Age range: ${guestProfile.ageRange}`,
    `Group type: ${groupLabels[guestProfile.groupType] ?? guestProfile.groupType}`,
    `Travel purpose: ${purposeLabels[guestProfile.travelPurpose] ?? guestProfile.travelPurpose}`,
    `Note: The NEARBY ATTRACTIONS section below is already sorted and scored for this specific profile.`,
    ``,
  ].join('\n')

  // Build the full knowledge string (with raw attractions dumped by default)
  const fullKnowledge = buildHotelKnowledge(
    { ...hotelSettings, nearbyAttractions: [] }, // pass empty so we control the section
    hotelData,
    weather,
    guestProfile
  )

  // Build the clustered attractions block — all ranked, top 3 highlighted
  const attractionsContext = buildClusteredAttractionsContext(
    hotelSettings?.nearbyAttractions ?? [],
    guestProfile,
    clusteringWeather,
    3
  )

  // Replace the empty "No nearby attractions" placeholder with the clustering block.
  // The placeholder is always present because we passed nearbyAttractions: [].
  const PLACEHOLDER = `=== NEARBY ATTRACTIONS ===\nNo nearby attractions are currently available in our database.\nPlease contact the front desk for information about local attractions and activities.\n`
  if (fullKnowledge.includes('=== NEARBY ATTRACTIONS ===')) {
    // Split at the attractions header and replace that section
    const parts = fullKnowledge.split('=== NEARBY ATTRACTIONS ===')
    const afterAttractions = parts[1] ?? ''
    const nextSectionIdx = afterAttractions.indexOf('===')
    const suffix = nextSectionIdx >= 0 ? afterAttractions.slice(nextSectionIdx) : ''
    return guestContextHeader + parts[0] + attractionsContext + '\n' + suffix
  }

  // Fallback: append clustering block at the end
  return guestContextHeader + fullKnowledge.replace(PLACEHOLDER, '') + '\n' + attractionsContext
}