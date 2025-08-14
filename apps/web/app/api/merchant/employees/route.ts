import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('👥 Merchant Employees API: Starting employee fetch...')

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('👥 Merchant Employees API: No Bearer token found')
      return createUnauthorizedResponse('Authorization token required')
    }

    const token = authHeader.substring(7)
    console.log('👥 Merchant Employees API: Token extracted, length:', token.length)

    // Get user from token
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('👥 Merchant Employees API: Authentication failed')
      return createUnauthorizedResponse('Authentication failed')
    }

    const user = authResult.user
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('👥 Merchant Employees API: Fetching employees with limit:', limit)

    // Fetch real data from database
    try {
      const { data: employees, error: employeesError } = await supabaseService.client
        .from('calvary_users')
        .select('id, first_name, last_name, email, role, is_active, created_at')
        .eq('role', 'employee')
        .limit(limit)

      if (employeesError) {
        console.error('👥 Merchant Employees API: Error fetching employees:', employeesError)
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
      }

      // Transform data to match expected format
      const realEmployees = employees?.map(emp => ({
        id: emp.id,
        firstName: emp.first_name || '',
        lastName: emp.last_name || '',
        email: emp.email,
        status: emp.is_active ? 'active' : 'inactive',
        department: 'General', // Placeholder since department column doesn't exist yet
        lastActive: emp.created_at,
        balance: 0, // TODO: Get from balance service when available
        currency: 'GHS'
      })) || []

      console.log('👥 Merchant Employees API: Returning real employees:', realEmployees.length)
      return NextResponse.json({
        success: true,
        employees: realEmployees
      })

    } catch (dbError) {
      console.error('👥 Merchant Employees API: Database error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

  } catch (error) {
    console.error('👥 Merchant Employees API: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for inviting employees
export async function POST(request: NextRequest) {
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
    const { email, firstName, lastName, department, spendingLimit } = body

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: email, firstName, lastName' } },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: { message: 'Invalid email format' } },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('calvary_users')
      .select('id, email, role, first_name, last_name')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('User check error:', checkError)
      return NextResponse.json(
        { error: { message: 'Failed to check existing user' } },
        { status: 500 }
      )
    }

    // Check if user already exists and handle different scenarios
    if (existingUser) {
      // Check if user has the right role (should be employee)
      if (existingUser.role !== 'employee') {
        return NextResponse.json(
          { error: { message: `Cannot invite ${existingUser.role} users. Only employees can be invited.` } },
          { status: 400 }
        )
      }

      // User exists and is an employee - can be invited
    }

    // Get merchant's company ID
    const companyId = user.userId

    // Generate invitation token
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // TODO: Create employee_invitations table to enable proper invitation functionality
    // For now, return a success response without creating the invitation record
    
    console.log('Invitation would be created:', {
      email,
      firstName,
      lastName,
      department,
      spendingLimit,
      invitationToken,
      expiresAt: expiresAt.toISOString()
    })

    // TODO: Send invitation email
    // In a production environment, you would send an email with the invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitationToken}`

    // Log the invitation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'employee_invited',
        resource_type: 'invitation',
        resource_id: 'temp_invitation',
        details: {
          email,
          firstName,
          lastName,
          department,
          spendingLimit,
          companyId
        }
      })

    return NextResponse.json({
      success: true,
      invitation: {
        id: 'temp_invitation',
        email,
        firstName,
        lastName,
        department,
        spendingLimit,
        invitationToken,
        invitationLink,
        expiresAt: expiresAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Employee invitation error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
