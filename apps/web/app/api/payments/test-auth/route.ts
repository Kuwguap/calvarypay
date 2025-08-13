import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth } from '@/lib/auth/payment-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test Auth: Testing payment authentication...')
    
    const authResult = await verifyPaymentAuth(request)
    
    console.log('🧪 Test Auth: Result:', authResult)
    
    if (authResult.success && authResult.user) {
      return NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user: {
          userId: authResult.user.userId,
          email: authResult.user.email,
          role: authResult.user.role
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Authentication failed',
        error: authResult.error
      }, { status: 401 })
    }
  } catch (error) {
    console.error('🧪 Test Auth: Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Authentication test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 