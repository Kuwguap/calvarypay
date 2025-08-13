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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    // Get merchant's company ID
    const companyId = user.userId

    // Build query
    let query = supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        is_active,
        last_login,
        created_at,
        metadata
      `)
      .eq('company_id', companyId)
      .eq('role', 'employee')
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (status !== 'all') {
      const isActive = status === 'active'
      query = query.eq('is_active', isActive)
    }

    if (limit > 0) {
      query = query.limit(limit)
    }

    const { data: employees, error: employeesError } = await query

    if (employeesError) {
      console.error('Employees fetch error:', employeesError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch employees' } },
        { status: 500 }
      )
    }

    // Format the response
    const formattedEmployees = employees.map(employee => ({
      id: employee.id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      status: employee.is_active ? 'active' : 'inactive',
      department: employee.metadata?.department || null,
      lastActive: employee.last_login,
      joinedAt: employee.created_at,
      spendingLimit: employee.metadata?.spending_limit || null
    }))

    // Log the access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'employees_accessed',
        resource_type: 'employees',
        resource_id: 'merchant_employees',
        details: {
          limit,
          search,
          status,
          companyId,
          employeeCount: formattedEmployees.length
        }
      })

    return NextResponse.json({
      employees: formattedEmployees,
      total: formattedEmployees.length
    })

  } catch (error) {
    console.error('Merchant employees error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
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
      .from('users')
      .select('id, email, role, company_id, first_name, last_name')
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
      // Check if user is already part of this company
      if (existingUser.company_id === companyId) {
        return NextResponse.json(
          { error: { message: 'User is already part of your company' } },
          { status: 409 }
        )
      }

      // Check if user is already part of another company
      if (existingUser.company_id && existingUser.company_id !== companyId) {
        return NextResponse.json(
          { error: { message: 'User is already employed by another company' } },
          { status: 409 }
        )
      }

      // Check if user has the right role (should be employee)
      if (existingUser.role !== 'employee') {
        return NextResponse.json(
          { error: { message: `Cannot invite ${existingUser.role} users. Only employees can be invited.` } },
          { status: 400 }
        )
      }

      // User exists, is an employee, and not part of any company - can be invited
    }

    // Get merchant's company ID
    const companyId = user.userId

    // Generate invitation token
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create employee invitation record
    const invitationData = {
      email,
      first_name: existingUser ? existingUser.first_name : firstName,
      last_name: existingUser ? existingUser.last_name : lastName,
      company_id: companyId,
      invited_by: user.userId,
      invitation_token: invitationToken,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      metadata: {
        department,
        spending_limit: spendingLimit,
        existing_user_id: existingUser ? existingUser.id : null,
        invitation_type: existingUser ? 'existing_user' : 'new_user'
      }
    }

    const { data: invitation, error: invitationError } = await supabase
      .from('employee_invitations')
      .insert(invitationData)
      .select()
      .single()

    if (invitationError) {
      console.error('Invitation creation error:', invitationError)
      return NextResponse.json(
        { error: { message: 'Failed to create invitation' } },
        { status: 500 }
      )
    }

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
        resource_id: invitation.id,
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
        id: invitation.id,
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
