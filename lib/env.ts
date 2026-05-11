// Environment Variables Validation
// OWASP: Validate all configuration at startup, fail fast on errors

import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { parse as parseDotenv } from 'dotenv'

interface EnvConfig {
  GROQ_API_KEY: string
  REDIS_URL: string
  NODE_ENV: string
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD_HASH: string
  ALLOWED_ORIGINS?: string[]
  ENABLE_RATE_LIMITING: boolean
}

interface BaseEnvConfig {
  NODE_ENV: string
  ALLOWED_ORIGINS?: string[]
  ENABLE_RATE_LIMITING: boolean
}

interface AuthEnvConfig extends BaseEnvConfig {
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD_HASH: string
}

let rawEnvFileCache: Record<string, string> | null = null

function getRawEnvFileValues(): Record<string, string> {
  if (rawEnvFileCache) {
    return rawEnvFileCache
  }

  const mergedValues: Record<string, string> = {}

  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(process.cwd(), fileName)

    if (!existsSync(filePath)) {
      continue
    }

    Object.assign(mergedValues, parseDotenv(readFileSync(filePath)))
  }

  rawEnvFileCache = mergedValues
  return mergedValues
}

function normalizeEnvValue(value?: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value.trim()

  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function getAdminPasswordHashValue(): string | undefined {
  const runtimeValue = normalizeEnvValue(process.env.ADMIN_PASSWORD_HASH)

  if (runtimeValue?.startsWith('$2')) {
    return runtimeValue
  }

  const rawFileValue = normalizeEnvValue(getRawEnvFileValues().ADMIN_PASSWORD_HASH)

  if (rawFileValue?.startsWith('$2')) {
    return rawFileValue
  }

  return runtimeValue ?? rawFileValue
}

function getBaseEnvConfig(): BaseEnvConfig {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : undefined

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    ALLOWED_ORIGINS: allowedOrigins,
    ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false'
  }
}

export function validateAuthEnv(): AuthEnvConfig {
  const errors: string[] = []
  const jwtSecret = normalizeEnvValue(process.env.JWT_SECRET)
  const adminUsername = normalizeEnvValue(process.env.ADMIN_USERNAME)
  const adminPasswordHash = getAdminPasswordHashValue()

  if (!jwtSecret) {
    errors.push('JWT_SECRET is missing - CRITICAL SECURITY ISSUE')
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long')
  } else if (jwtSecret === 'tunisia-hotels-secret-key-change-in-production') {
    errors.push('JWT_SECRET is using default value - MUST be changed for security')
  }

  if (!adminUsername) {
    errors.push('ADMIN_USERNAME is missing')
  }

  if (!adminPasswordHash) {
    errors.push('ADMIN_PASSWORD_HASH is missing - use scripts/hash-password.js to generate')
  } else if (!adminPasswordHash.startsWith('$2')) {
    errors.push('ADMIN_PASSWORD_HASH appears invalid (should be bcrypt hash starting with $2)')
  }

  if (errors.length > 0) {
    console.error('❌ Auth environment validation failed:')
    errors.forEach(error => console.error(`   - ${error}`))
    console.error('\n💡 See .env.local.example for required variables')
    throw new Error(`Auth environment validation failed: ${errors.join(', ')}`)
  }

  return {
    ...getBaseEnvConfig(),
    JWT_SECRET: jwtSecret!,
    ADMIN_USERNAME: adminUsername!,
    ADMIN_PASSWORD_HASH: adminPasswordHash!
  }
}

export function validateEnv(): EnvConfig {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required API keys
  if (!process.env.GROQ_API_KEY) {
    errors.push('GROQ_API_KEY is missing')
  }

  if (!process.env.REDIS_URL) {
    errors.push('REDIS_URL is missing')
  }

  const authEnv = validateAuthEnv()

  // Validate format of API keys
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('gsk_')) {
    warnings.push('GROQ_API_KEY appears to be invalid (should start with "gsk_")')
  }

  if (process.env.REDIS_URL && !process.env.REDIS_URL.startsWith('redis://')) {
    warnings.push('REDIS_URL appears to be invalid (should start with "redis://")')
  }

  // Display warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment validation warnings:')
    warnings.forEach(warning => console.warn(`   - ${warning}`))
  }

  // Fail on errors
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:')
    errors.forEach(error => console.error(`   - ${error}`))
    console.error('\n💡 See .env.local.example for required variables')
    throw new Error(`Environment validation failed: ${errors.join(', ')}`)
  }

  console.log('✅ Environment variables validated successfully')

  return {
    GROQ_API_KEY: process.env.GROQ_API_KEY!,
    REDIS_URL: process.env.REDIS_URL!,
    ...authEnv
  }
}

// Get validated environment variables
export function getEnv(): EnvConfig {
  return validateEnv()
}

export function getAuthEnv(): AuthEnvConfig {
  return validateAuthEnv()
}

// Check if running in production
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

// Check if running in development
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
}
