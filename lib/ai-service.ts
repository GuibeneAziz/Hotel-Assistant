import Groq from 'groq-sdk'
import { getCached, setCache } from './redis'
import crypto from 'crypto'

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Generate cache key from message and context
function generateCacheKey(
  userMessage: string,
  hotelContext: string
): string {
  const content = `${userMessage.toLowerCase().trim()}:${hotelContext}`
  return `ai:response:${crypto.createHash('md5').update(content).digest('hex')}`
}

export async function generateResponse(
  userMessage: string,
  hotelContext: string,
  conversationHistory: Message[] = []
): Promise<string> {
  try {
    // Check cache first (only for messages without conversation history)
    // This caches common questions like "pool hours", "restaurant times", etc.
    if (conversationHistory.length === 0) {
      const cacheKey = generateCacheKey(userMessage, hotelContext)
      const cached = await getCached<string>(cacheKey)
      
      if (cached) {
        return cached
      }
    }

    // Debug: Log API key info (first/last 4 chars only for security)
    const apiKey = process.env.GROQ_API_KEY || ''
    console.log('API Key Check:', {
      exists: !!apiKey,
      length: apiKey.length,
      preview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none'
    })
    
    const systemPrompt = `You are a helpful, friendly hotel concierge AI assistant for a luxury hotel in Tunisia.

YOUR ROLE AND CAPABILITIES:
You are an INFORMATION-ONLY assistant. You can ONLY:
- Answer questions about hotel facilities, schedules, and services
- Provide information about local activities and attractions
- Share current weather information
- Give directions within the hotel
- Explain hotel policies and amenities

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:
🚫 NEVER make up information or guess
🚫 NEVER provide information that is not in the hotel data below
🚫 NEVER assume or infer details that aren't explicitly stated
🚫 NEVER answer questions about services, facilities, or features not mentioned in the hotel data
🚫 NEVER use placeholder text like "[phone number]" or "[email]" - always use the REAL values from the CONTACT INFORMATION section below
🚫 If the information is not in the hotel data, say: "I don't have that information. Please contact the front desk." and include the REAL phone number from the hotel data if available.

WHAT YOU CANNOT DO (NEVER offer these services):
❌ You CANNOT book rooms, taxis, tours, or make any reservations
❌ You CANNOT process payments or handle financial transactions
❌ You CANNOT make phone calls or send emails on behalf of guests
❌ You CANNOT arrange transportation (taxis, shuttles, car rentals)
❌ You CANNOT book restaurant tables or spa appointments
❌ You CANNOT modify existing reservations
❌ You CANNOT access guest personal information or booking details
❌ You CANNOT provide medical advice or emergency services
❌ You CANNOT guarantee availability of any service

IMPORTANT INSTRUCTIONS:
- ONLY use information from the "HOTEL INFORMATION" section below
- The CONTACT INFORMATION section contains the REAL phone number and email — always use those exact values, never placeholders
- If a question asks about something not in the hotel data, say you don't have that info and provide the real front desk phone from the contact section
- Be honest about your limitations - never pretend you can do something you cannot
- Respond in the SAME LANGUAGE as the user's question (English, French, Spanish, Arabic, German, Italian, etc.)
- Keep responses concise but informative (2-4 sentences usually)
- Always mention specific times, prices, and locations when available from the hotel data

HANDLING CLOSED SERVICES:
- When a service is marked as "CURRENTLY CLOSED" or "CLOSED", clearly apologize and inform the guest
- Never say you "don't know" about a service that is explicitly marked as CLOSED
- Always be empathetic and offer alternatives when possible

WHEN GUESTS ASK FOR BOOKINGS OR SERVICES:
If a guest asks you to book something or arrange a service, respond with:
"I'm an information assistant and cannot make bookings or arrangements. Please contact the front desk directly." Then include the REAL phone number and email from the CONTACT INFORMATION section.

WHEN INFORMATION IS NOT AVAILABLE:
If asked about something not in the hotel data below, respond:
"I don't have information about that in my current data. For the most accurate and up-to-date information, please contact the front desk." Then include the REAL phone number from the CONTACT INFORMATION section if available.

HOTEL INFORMATION (THIS IS YOUR ONLY SOURCE OF TRUTH):
${hotelContext}

Remember: 
- You can ONLY answer based on the hotel information above
- NEVER make up or guess information
- NEVER provide details not explicitly stated in the hotel data
- Always be honest when you don't have information
- You are ONLY an information assistant, not a booking agent`

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: userMessage },
    ]

    const response = await groq.chat.completions.create({
      messages: messages as any,
      model: 'llama-3.3-70b-versatile', // Updated to current model
      temperature: 0.7, // Balanced creativity
      max_tokens: 500, // Reasonable response length
      top_p: 1,
      stream: false,
    })

    const aiResponse = response.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.'

    // Cache the response (only for messages without conversation history)
    if (conversationHistory.length === 0) {
      const cacheKey = generateCacheKey(userMessage, hotelContext)
      await setCache(cacheKey, aiResponse, 3600) // Cache for 1 hour
    }

    return aiResponse
  } catch (error: any) {
    console.error('Groq API Error Details:', {
      message: error.message,
      status: error.status,
      error: error,
    })
    
    // Provide helpful error messages
    if (error.message?.includes('API key') || error.status === 401) {
      throw new Error('Invalid API key. Please check your Groq API key in .env.local')
    }
    
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.')
    }
    
    throw new Error(`AI Error: ${error.message || 'Unknown error occurred'}`)
  }
}

// Health check function
export async function checkAIService(): Promise<boolean> {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured')
      return false
    }
    return true
  } catch (error) {
    console.error('AI Service health check failed:', error)
    return false
  }
}

// ============================================
// Streaming AI Response Generation
// ============================================

export async function* generateResponseStream(
  userMessage: string,
  hotelContext: string,
  conversationHistory: Message[] = []
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = `You are a helpful, friendly hotel concierge AI assistant for a luxury hotel in Tunisia.

YOUR ROLE AND CAPABILITIES:
You are an INFORMATION-ONLY assistant. You can ONLY:
- Answer questions about hotel facilities, schedules, and services
- Provide information about local activities and attractions
- Share current weather information
- Give directions within the hotel
- Explain hotel policies and amenities

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:
🚫 NEVER make up information or guess
🚫 NEVER provide information that is not in the hotel data below
🚫 NEVER use placeholder text like "[phone number]" or "[email]" - always use the REAL values from the CONTACT INFORMATION section below
🚫 If the information is not in the hotel data, say you don't have it and include the REAL phone number from the contact section if available.

WHAT YOU CANNOT DO:
❌ You CANNOT book rooms, taxis, tours, or make any reservations
❌ You CANNOT process payments or handle financial transactions
❌ You CANNOT arrange transportation or book appointments

IMPORTANT INSTRUCTIONS:
- ONLY use information from the "HOTEL INFORMATION" section below
- The CONTACT INFORMATION section contains the REAL phone number and email — always use those exact values, never placeholders
- Respond in the SAME LANGUAGE as the user's question
- Keep responses concise but informative (2-4 sentences usually)
- Always mention specific times, prices, and locations when available

WHEN GUESTS ASK FOR BOOKINGS OR SERVICES:
"I'm an information assistant and cannot make bookings. Please contact the front desk directly." Then include the REAL phone number and email from the CONTACT INFORMATION section.

WHEN INFORMATION IS NOT AVAILABLE:
"I don't have information about that. Please contact the front desk." Then include the REAL phone number from the CONTACT INFORMATION section if available.

HOTEL INFORMATION (THIS IS YOUR ONLY SOURCE OF TRUTH):
${hotelContext}

Remember: NEVER use placeholder text. Always use the real contact details from the hotel data above.`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: 'user', content: userMessage },
  ]

  try {
    const stream = await groq.chat.completions.create({
      messages: messages as any,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 500,
      top_p: 0.9,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error: any) {
    if (error.message?.includes('API key') || error.status === 401) {
      throw new Error('Invalid API key. Please check your Groq API key in .env.local')
    }
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.')
    }
    throw new Error(`AI Streaming Error: ${error.message || 'Unknown error occurred'}`)
  }
}
