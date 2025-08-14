import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { LANDING_PAGE_TEMPLATES } from '@/lib/config/landing-page.config'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse('Authentication failed')
    }

    // Verify admin role
    if (authResult.user.role !== 'admin') {
      return createForbiddenResponse('Admin access required')
    }

    // Return all available themes
    return NextResponse.json({
      success: true,
      themes: LANDING_PAGE_TEMPLATES
    })

  } catch (error) {
    console.error('Admin themes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse('Authentication failed')
    }

    // Verify admin role
    if (authResult.user.role !== 'admin') {
      return createForbiddenResponse('Admin access required')
    }

    const body = await request.json()
    const { themeId, action } = body

    if (!themeId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: themeId, action' },
        { status: 400 }
      )
    }

    if (action === 'activate') {
      // Update theme configuration
      const updatedTemplates = LANDING_PAGE_TEMPLATES.map(template => ({
        ...template,
        isActive: template.id === themeId
      }))

      // In a real application, you would save this to a database
      // For now, we'll return the updated configuration
      return NextResponse.json({
        success: true,
        message: `Theme ${themeId} activated successfully`,
        themes: updatedTemplates
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin themes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 