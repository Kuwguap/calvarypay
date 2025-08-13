import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Token Verification: Starting token validation...')

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('🔍 Token Verification: No Bearer token found')
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify token using enhanced auth middleware
    const verification = await enhancedAuthMiddleware.verifyAccessToken(token)

    if (!verification.valid) {
      console.log('🔍 Token Verification: Token invalid:', verification.error)
      return NextResponse.json(
        { error: verification.error || 'Invalid token' },
        { status: 401 }
      )
    }

    console.log('🔍 Token Verification: Token valid for user:', verification.payload?.userId)
    
    return NextResponse.json({
      valid: true,
      user: {
        userId: verification.payload?.userId,
        email: verification.payload?.email,
        role: verification.payload?.role
      }
    })

  } catch (error) {
    console.error('🔍 Token Verification: Error:', error)
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: { message: 'Method not allowed' } },
    { status: 405 }
  )
}
