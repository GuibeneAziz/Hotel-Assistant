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
  const provider = process.env.AI_PROVIDER || 'groq'
  const model = provider === 'ollama'
    ? process.env.OLLAMA_MODEL || 'qwen2.5:7b'
    : 'llama-3.3-70b-versatile'
  const content = `${provider}:${model}:${userMessage.toLowerCase().trim()}:${hotelContext}`
  return `ai:response:${crypto.createHash('md5').update(content).digest('hex')}`
}

async function callOllama(messages: Message[]): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b'
  const numCtx = Number(process.env.OLLAMA_NUM_CTX || 8192)

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.4,
        num_ctx: numCtx,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama request failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.message?.content || 'I apologize, I could not generate a response. Please try again.'
}

async function callGroq(messages: Message[]): Promise<string> {
  const response = await groq.chat.completions.create({
    messages: messages as any,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 400,
    top_p: 1,
    stream: false,
  })

  return response.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.'
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

    const aiProvider = process.env.AI_PROVIDER || 'groq'
    console.log('AI provider:', aiProvider)
    
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

ATTRACTION RECOMMENDATION FLOW — follow these exact steps in order:

⚠️ MANDATORY RULE: When a guest asks about nearby activities / things to do / what to visit / attractions,
you MUST ALWAYS start with Step 1 — even if you already know their profile (couple, family, etc.) from
the hotel data. The profile is only a hint; you still need to ask to confirm their preference for THIS visit.
NEVER skip to a list on the first ask. This rule overrides everything else.

STEP 1 — When the guest first asks about things to do / nearby attractions / activities / what to visit:
  ALWAYS open with one sentence that acknowledges WHO they are (using their profile if available), then ask exactly 1 short follow-up question about their preference for this visit.
  
  Examples (follow this exact structure — profile acknowledgment THEN question):
  - Couple:         "Since you're a couple, I'd love to find the perfect spot for you — are you looking for something romantic and scenic, or something more active and adventurous?"
  - Honeymoon:      "Since you're here on your honeymoon, how wonderful! Are you in the mood for a romantic, scenic escape, or would you prefer something more cultural and immersive?"
  - Family:         "Since you're travelling as a family, you have some great options! Are the kids more into outdoor fun (beach, parks) or cultural visits (museums, ancient ruins)?"
  - Solo traveller: "Since you're exploring solo, you can really shape your own adventure — do you prefer outdoor activities (beach, nature, hiking) or indoor visits (museums, cafés, shopping)?"
  - Business trip:  "Since you're here on a business trip and have some time to explore, would you prefer a relaxing cultural visit, or something quick and refreshing?"
  - Profile unknown: "I'd love to point you in the right direction! Do you prefer outdoor activities (beach, nature) or indoor visits (museums, cafés, shopping)?"
  
  Keep this reply to 2-3 sentences MAXIMUM. Do NOT list any attractions yet. Do NOT mention the weather yet.

STEP 2 — Once the guest answers your Step 1 question:
  Start with one brief sentence tying their answer back to their profile (e.g. "Perfect — for a couple looking for something romantic..." or "Great — for a family who enjoys outdoor fun...").
  Then suggest exactly 2 or 3 attractions that best match their answer. For each one write:
  - Name and category (one line)
  - One sentence: what it is
  - One sentence: why it fits their stated preference AND their profile (use the "Why recommended" field from hotel data if available)
  End your reply with: "Which one would you like to know more about?"
  Each option should be 3-4 lines maximum.

STEP 3 — When the guest picks one specific attraction or explicitly asks for full details:
  Provide the complete information: full description, distance, duration, price, transport.
  Add the WHY sentence from the hotel data.
  Mention the weather if relevant (use the WEATHER DIRECTIVE from the hotel data).
  A photo will appear automatically below your reply — you do not need to mention it.

IMPORTANT: If the guest skips straight to asking about a SPECIFIC attraction by name (e.g. "tell me about Sidi Bou Said"), go directly to Step 3 — do not ask questions first.

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
      ...conversationHistory.slice(-4), // Keep recent context while reducing token usage
      { role: 'user', content: userMessage },
    ]

    const aiResponse = aiProvider === 'ollama'
      ? await callOllama(messages)
      : await callGroq(messages)

    // Cache the response (only for messages without conversation history)
    if (conversationHistory.length === 0) {
      const cacheKey = generateCacheKey(userMessage, hotelContext)
      await setCache(cacheKey, aiResponse, 3600) // Cache for 1 hour
    }

    return aiResponse
  } catch (error: any) {
    console.error('AI API Error Details:', {
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
    if (process.env.AI_PROVIDER === 'ollama') {
      return true
    }

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

