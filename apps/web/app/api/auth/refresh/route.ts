import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Token Refresh: Starting token refresh...')

    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      console.log('🔄 Token Refresh: No refresh token provided')
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      )
    }

    // Use enhanced auth middleware to refresh token
    const result = await enhancedAuthMiddleware.refreshAccessToken(refreshToken)

    if (!result.success) {
      console.log('🔄 Token Refresh: Refresh failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'Token refresh failed' },
        { status: 401 }
      )
    }

    console.log('🔄 Token Refresh: Token refreshed successfully')
    
    return NextResponse.json({
      accessToken: result.accessToken,
      refreshToken: result.newRefreshToken
    })

  } catch (error) {
    console.error('🔄 Token Refresh: Error:', error)
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    )
  }
} 