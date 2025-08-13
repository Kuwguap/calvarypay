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

    // Only allow employees to access this endpoint
    if (user.role !== 'employee') {
      return NextResponse.json(
        { error: { message: 'Access denied. Employee role required.' } },
        { status: 403 }
      )
    }

    // Get employee's current information including company
    const { data: employee, error: employeeError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        company_id,
        metadata,
        created_at,
        company:users!users_company_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone,
          metadata
        )
      `)
      .eq('id', user.id)
      .single()

    if (employeeError) {
      console.error('Employee fetch error:', employeeError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch employee information' } },
        { status: 500 }
      )
    }

    // If employee is not part of any company
    if (!employee.company_id || !employee.company) {
      return NextResponse.json({
        hasCompany: false,
        employee: {
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          department: employee.metadata?.department || null,
          spendingLimit: employee.metadata?.spending_limit || 0,
          joinedAt: employee.metadata?.joined_company_at || null
        },
        company: null,
        colleagues: [],
        pendingInvitations: []
      })
    }

    // Get company colleagues (other employees)
    const { data: colleagues, error: colleaguesError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, metadata, last_login')
      .eq('company_id', employee.company_id)
      .eq('role', 'employee')
      .neq('id', employee.id)
      .eq('is_active', true)

    if (colleaguesError) {
      console.error('Colleagues fetch error:', colleaguesError)
    }

    // Get pending invitations for this employee
    const { data: pendingInvitations, error: invitationsError } = await supabase
      .from('employee_invitations')
      .select(`
        id,
        email,
        status,
        created_at,
        expires_at,
        metadata,
        company:users!employee_invitations_company_id_fkey(
          first_name,
          last_name
        )
      `)
      .eq('email', employee.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (invitationsError) {
      console.error('Invitations fetch error:', invitationsError)
    }

    // Format company information
    const companyInfo = {
      id: employee.company.id,
      name: `${employee.company.first_name} ${employee.company.last_name}`,
      email: employee.company.email,
      phone: employee.company.phone,
      address: employee.company.metadata?.companySettings?.companyAddress || '',
      defaultCurrency: employee.company.metadata?.companySettings?.defaultCurrency || 'GHS',
      spendingLimits: employee.company.metadata?.companySettings?.spendingLimits || {
        daily: 10000,
        monthly: 100000,
        perTransaction: 5000
      }
    }

    // Format employee information
    const employeeInfo = {
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      email: employee.email,
      department: employee.metadata?.department || 'Unassigned',
      spendingLimit: employee.metadata?.spending_limit || 0,
      joinedAt: employee.metadata?.joined_company_at || employee.created_at,
      permissions: employee.metadata?.permissions || []
    }

    // Format colleagues
    const formattedColleagues = (colleagues || []).map(colleague => ({
      id: colleague.id,
      name: `${colleague.first_name} ${colleague.last_name}`,
      email: colleague.email,
      department: colleague.metadata?.department || 'Unassigned',
      lastActive: colleague.last_login,
      isOnline: colleague.last_login && 
        new Date(colleague.last_login) > new Date(Date.now() - 15 * 60 * 1000) // 15 minutes
    }))

    // Format pending invitations
    const formattedInvitations = (pendingInvitations || []).map(invitation => ({
      id: invitation.id,
      companyName: `${invitation.company.first_name} ${invitation.company.last_name}`,
      department: invitation.metadata?.department,
      spendingLimit: invitation.metadata?.spending_limit,
      expiresAt: invitation.expires_at,
      createdAt: invitation.created_at
    }))

    // Log the access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'company_info_accessed',
        resource_type: 'company_info',
        resource_id: employee.company_id,
        details: {
          employeeId: employee.id,
          companyId: employee.company_id
        }
      })

    return NextResponse.json({
      hasCompany: true,
      employee: employeeInfo,
      company: companyInfo,
      colleagues: formattedColleagues,
      pendingInvitations: formattedInvitations,
      stats: {
        totalColleagues: formattedColleagues.length,
        onlineColleagues: formattedColleagues.filter(c => c.isOnline).length,
        pendingInvitations: formattedInvitations.length
      }
    })

  } catch (error) {
    console.error('Employee company info error:', error)
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
