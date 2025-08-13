import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Invitation token required' } },
        { status: 400 }
      )
    }

    // Fetch invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('employee_invitations')
      .select(`
        id,
        email,
        first_name,
        last_name,
        company_id,
        invited_by,
        invitation_token,
        status,
        expires_at,
        metadata,
        users!employee_invitations_company_id_fkey(
          first_name,
          last_name,
          email
        ),
        invited_by_user:users!employee_invitations_invited_by_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('invitation_token', token)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: { message: 'Invitation not found or invalid' } },
        { status: 404 }
      )
    }

    // Check if invitation is still valid
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)

    if (now > expiresAt) {
      return NextResponse.json(
        { error: { message: 'Invitation has expired' } },
        { status: 410 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: { message: `Invitation has already been ${invitation.status}` } },
        { status: 409 }
      )
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', invitation.company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      )
    }

    // Format response
    const invitationDetails = {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      companyName: `${company.first_name} ${company.last_name}`,
      invitedBy: `${invitation.invited_by_user.first_name} ${invitation.invited_by_user.last_name}`,
      department: invitation.metadata?.department,
      spendingLimit: invitation.metadata?.spending_limit,
      expiresAt: invitation.expires_at,
      invitationType: invitation.metadata?.invitation_type || 'new_user'
    }

    return NextResponse.json({
      success: true,
      invitation: invitationDetails
    })

  } catch (error) {
    console.error('Invitation details error:', error)
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
