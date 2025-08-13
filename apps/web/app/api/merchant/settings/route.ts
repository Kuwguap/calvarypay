import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/services/auth.service'

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Authorization token required' } },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const user = await authService.verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Only allow merchants to access this endpoint
    if (user.role !== 'merchant') {
      return NextResponse.json(
        { error: { message: 'Access denied. Merchant role required.' } },
        { status: 403 }
      )
    }

    // Get merchant's settings
    const { data: userSettings, error: userError } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', user.userId)
      .single()

    if (userError) {
      console.error('User settings fetch error:', userError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch user settings' } },
        { status: 500 }
      )
    }

    // Default settings structure
    const defaultSettings = {
      companyName: user.firstName + ' ' + user.lastName + ' Company',
      companyEmail: user.email,
      companyPhone: '',
      companyAddress: '',
      defaultCurrency: 'GHS',
      spendingLimits: {
        daily: 10000,
        monthly: 100000,
        perTransaction: 5000
      },
      approvalSettings: {
        requireApproval: true,
        approvalThreshold: 1000,
        autoApproveCategories: ['fuel', 'parking']
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        transactionAlerts: true,
        weeklyReports: true,
        monthlyReports: true
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: 60,
        ipWhitelist: []
      }
    }

    // Merge with stored settings
    const settings = {
      ...defaultSettings,
      ...(userSettings.metadata?.companySettings || {})
    }

    // Log the settings access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'settings_accessed',
        resource_type: 'settings',
        resource_id: 'merchant_settings',
        details: {
          companyId: user.userId
        }
      })

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Merchant settings error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Authorization token required' } },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const user = await authService.verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Only allow merchants to access this endpoint
    if (user.role !== 'merchant') {
      return NextResponse.json(
        { error: { message: 'Access denied. Merchant role required.' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Get current user metadata
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', user.userId)
      .single()

    if (fetchError) {
      console.error('User fetch error:', fetchError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch current settings' } },
        { status: 500 }
      )
    }

    // Merge new settings with existing metadata
    const currentMetadata = currentUser.metadata || {}
    const currentCompanySettings = currentMetadata.companySettings || {}
    
    const updatedCompanySettings = {
      ...currentCompanySettings,
      ...body
    }

    const updatedMetadata = {
      ...currentMetadata,
      companySettings: updatedCompanySettings
    }

    // Update user metadata
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.userId)
      .select()
      .single()

    if (updateError) {
      console.error('Settings update error:', updateError)
      return NextResponse.json(
        { error: { message: 'Failed to update settings' } },
        { status: 500 }
      )
    }

    // Log the settings update
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'settings_updated',
        resource_type: 'settings',
        resource_id: 'merchant_settings',
        details: {
          companyId: user.userId,
          updatedFields: Object.keys(body),
          changes: body
        }
      })

    return NextResponse.json({
      success: true,
      settings: updatedCompanySettings
    })

  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: { message: 'Method not allowed' } },
    { status: 405 }
  )
}
