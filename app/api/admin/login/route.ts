import { NextRequest, NextResponse } from 'next/server'
import { sign } from 'jsonwebtoken'
import { verifyPassword } from '@/lib/password'
import { getAuthEnv } from '@/lib/env'
import { checkRateLimit } from '@/lib/rate-limit-helper'

// OWASP: Never use hardcoded secrets - always use environment variables

export async function POST(request: NextRequest) {
  try {
    // OWASP: Rate limiting on authentication endpoints prevents brute force attacks
    const rateLimitResponse = await checkRateLimit(request, 'auth')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Get validated environment configuration (lazy load)
    const env = getAuthEnv()
    
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username and password are required'
        },
        { status: 400 }
      )
    }

    // Get admin credentials from environment variables
    const adminUsername = env.ADMIN_USERNAME
    const adminPasswordHash = env.ADMIN_PASSWORD_HASH

    // Validate username first (fast check)
    if (username !== adminUsername) {
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.warn(`⚠️  Failed login attempt for username: ${username}`)
      
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid username or password'
        },
        { status: 401 }
      )
    }

    // Verify password using bcrypt (constant-time comparison)
    // OWASP: Use bcrypt for password hashing, never plain text
    const isValidPassword = await verifyPassword(password, adminPasswordHash)

    if (isValidPassword) {
      // Generate JWT token with secure secret
      const token = sign(
        { 
          username, 
          role: 'admin', 
          timestamp: Date.now() 
        },
        env.JWT_SECRET,
        { 
          expiresIn: '24h',
          issuer: 'tunisia-hotel-assistant',
          audience: 'tunisia-hotel-api'
        }
      )

      console.log(`✅ Successful login for admin: ${username}`)

      return NextResponse.json({
        success: true,
        token,
        message: 'Login successful'
      })
    } else {
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.warn(`⚠️  Failed login attempt - invalid password for: ${username}`)
      
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid username or password'
        },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Login error:', error)
    
    // OWASP: Don't expose internal errors to clients
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred during login'
      },
      { status: 500 }
    )
  }
}
