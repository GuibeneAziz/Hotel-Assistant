import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { getAuthEnv } from '@/lib/env'

// OWASP: Use secure JWT secret from environment

export async function GET(request: NextRequest) {
  try {
    // Get validated environment configuration (lazy load)
    const env = getAuthEnv()
    
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    try {
      // Verify JWT with secure secret
      const decoded = verify(token, env.JWT_SECRET, {
        issuer: 'tunisia-hotel-assistant',
        audience: 'tunisia-hotel-api'
      })
      
      return NextResponse.json({
        success: true,
        user: decoded
      })
    } catch (error: any) {
      console.warn('⚠️  Invalid token verification attempt:', error.message)
      
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Token verification error:', error)
    
    return NextResponse.json(
      { success: false, message: 'Verification failed' },
      { status: 500 }
    )
  }
}
