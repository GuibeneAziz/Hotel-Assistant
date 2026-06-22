// Password Security Utility
// OWASP: Use strong password hashing (bcrypt with 12+ salt rounds)

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 * OWASP: Never store passwords in plain text
 * @param password - Plain text password to hash
 * @returns Promise<string> - Bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty')
  }
  
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 * Uses constant-time comparison to prevent timing attacks
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false
  }
  
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

/**
 * Validate password strength
 * OWASP: Enforce strong password requirements
 * @param password - Password to validate
 * @returns Object with validation result and errors
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Minimum length
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  }
  
  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  // Number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  // Special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Generate a script to hash a password for environment variables
 * Usage: node scripts/hash-password.js <password>
 */
export async function generatePasswordHash(password: string): Promise<void> {
  const validation = validatePasswordStrength(password)
  
  if (!validation.valid) {
    console.error('❌ Password does not meet requirements:')
    validation.errors.forEach(err => console.error(`   - ${err}`))
    return
  }
  
  const hash = await hashPassword(password)
  console.log('\n✅ Password hash generated successfully!')
  console.log('\nAdd this to your .env file:')
  console.log(`ADMIN_PASSWORD_HASH=${hash}`)
  console.log('\n⚠️  Keep this hash secure and never commit it to version control!')
}
