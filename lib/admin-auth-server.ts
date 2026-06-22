import type { NextRequest } from 'next/server'
import { verify } from 'jsonwebtoken'
import { getAuthEnv } from './env'

export function isAdminRequest(request: NextRequest): boolean {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return false

    verify(authHeader.slice(7), getAuthEnv().JWT_SECRET, {
      issuer: 'tunisia-hotel-assistant',
      audience: 'tunisia-hotel-api',
    })
    return true
  } catch {
    return false
  }
}
