import { z } from 'zod'

// OWASP: Input Sanitization Functions

/**
 * Sanitize HTML input to prevent XSS attacks
 * Strips all HTML tags and returns plain text
 * @param input - String that may contain HTML
 * @returns Sanitized plain text
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''

  let output = ''
  let insideTag = false
  for (const character of input) {
    if (character === '<') {
      insideTag = true
    } else if (character === '>') {
      insideTag = false
    } else if (!insideTag) {
      output += character
    }
  }
  return output
}

/**
 * Sanitize string input by escaping special characters
 * Prevents XSS and injection attacks
 * @param input - String to sanitize
 * @returns Sanitized string with escaped characters
 */
export function sanitizeString(input: string): string {
  if (!input) return ''
  
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate and sanitize data against a Zod schema
 * Combines validation with automatic sanitization
 * @param schema - Zod schema to validate against
 * @param data - Data to validate and sanitize
 * @returns Validation result with sanitized data
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean
  data?: T
  errors?: string[]
} {
  // First sanitize string fields if data is an object
  if (typeof data === 'object' && data !== null) {
    data = sanitizeObjectStrings(data)
  }
  
  // Then validate
  return validateData(schema, data)
}

/**
 * Recursively sanitize all string fields in an object
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
function sanitizeObjectStrings(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectStrings(item))
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {}
    for (const key in obj) {
      sanitized[key] = sanitizeObjectStrings(obj[key])
    }
    return sanitized
  }
  
  return obj
}

// Secure schema helpers with built-in sanitization
export const secureStringSchema = z.string().transform(sanitizeHtml)
export const secureEmailSchema = z.string().email().transform(s => s.toLowerCase().trim())
export const securePasswordSchema = z.string().min(12)

// Time format validation (HH:MM)
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

// Chat Message Validation
export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long (max 1000 characters)'),
  hotelSettings: z.any().optional(),
  hotelData: z.any().optional(),
  weather: z.any().optional(),
  sessionId: z.string().nullish(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
})

// Meal Time Validation
const mealTimeSchema = z.object({
  start: z.string().regex(timeRegex, 'Invalid time format (use HH:MM)'),
  end: z.string().regex(timeRegex, 'Invalid time format (use HH:MM)'),
  available: z.boolean()
}).refine(
  (data) => !data.available || data.start < data.end,
  { message: 'Start time must be before end time' }
)

// Facility Hours Validation
const facilityHoursSchema = z.object({
  openTime: z.string().regex(timeRegex, 'Invalid time format (use HH:MM)'),
  closeTime: z.string().regex(timeRegex, 'Invalid time format (use HH:MM)'),
  available: z.boolean()
})

// Special Event Validation
const specialEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  time: z.string().regex(timeRegex, 'Invalid time format (use HH:MM)'),
  location: z.string().min(1, 'Location is required').max(100, 'Location too long'),
  price: z.string().optional()
})

// Contact Info Validation
const contactInfoSchema = z.object({
  phone: z.string()
    .min(1, 'Phone is required')
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone format'),
  email: z.string()
    .email('Invalid email format'),
  address: z.string()
    .min(1, 'Address is required')
    .max(200, 'Address too long'),
  emergencyPhone: z.string()
    .min(1, 'Emergency phone is required')
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone format')
})

// Amenity Settings Validation
const amenitySettingsSchema = z.object({
  available: z.boolean(),
  password: z.string().optional(),
  instructions: z.string().max(200, 'Instructions too long').optional(),
  price: z.string().optional()
})

// Check In/Out Validation
const checkInOutSchema = z.object({
  time: z.string().regex(timeRegex, 'Invalid time format (use HH:MM)'),
  instructions: z.string().max(200, 'Instructions too long').optional()
})

// Complete Hotel Settings Validation
export const hotelSettingsSchema = z.object({
  name: z.string().min(1, 'Hotel name is required'),
  restaurant: z.object({
    breakfast: mealTimeSchema,
    lunch: mealTimeSchema,
    dinner: mealTimeSchema
  }),
  spa: z.object({
    available: z.boolean(),
    openTime: z.string().regex(timeRegex, 'Invalid time format'),
    closeTime: z.string().regex(timeRegex, 'Invalid time format'),
    treatments: z.array(z.string())
  }),
  pool: facilityHoursSchema,
  gym: facilityHoursSchema,
  kidsClub: facilityHoursSchema.extend({
    ageRange: z.string()
  }),
  specialEvents: z.array(specialEventSchema),
  contact: contactInfoSchema,
  wifi: amenitySettingsSchema,
  parking: amenitySettingsSchema,
  checkIn: checkInOutSchema,
  checkOut: checkInOutSchema
})

// Validation helper function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: string[]
} {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
      return { success: false, errors }
    }
    return { success: false, errors: ['Validation failed'] }
  }
}

// Safe parse helper (doesn't throw)
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data)
}
