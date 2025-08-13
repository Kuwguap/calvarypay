import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/services/auth.service'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Invitation token required' } },
        { status: 400 }
      )
    }

    // Get authorization header (optional for new users)
    const authHeader = request.headers.get('authorization')
    let currentUser = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authToken = authHeader.substring(7)
      currentUser = await authService.verifyToken(authToken)
    }

    // Fetch invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('employee_invitations')
      .select('*')
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

    const invitationType = invitation.metadata?.invitation_type || 'new_user'
    const existingUserId = invitation.metadata?.existing_user_id

    // Handle existing user invitation
    if (invitationType === 'existing_user' && existingUserId) {
      // Verify the current user matches the invited user
      if (!currentUser) {
        return NextResponse.json(
          { error: { message: 'Authentication required to accept invitation' } },
          { status: 401 }
        )
      }

      if (currentUser.id !== existingUserId) {
        return NextResponse.json(
          { error: { message: 'You can only accept invitations sent to your account' } },
          { status: 403 }
        )
      }

      // Check if user is already part of another company
      const { data: userCheck, error: userCheckError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', existingUserId)
        .single()

      if (userCheckError) {
        return NextResponse.json(
          { error: { message: 'Failed to verify user status' } },
          { status: 500 }
        )
      }

      if (userCheck.company_id && userCheck.company_id !== invitation.company_id) {
        return NextResponse.json(
          { error: { message: 'You are already employed by another company' } },
          { status: 409 }
        )
      }

      if (userCheck.role !== 'employee') {
        return NextResponse.json(
          { error: { message: 'Only employee accounts can accept company invitations' } },
          { status: 400 }
        )
      }

      // Update user to join the company
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          company_id: invitation.company_id,
          metadata: {
            ...userCheck.metadata,
            department: invitation.metadata?.department,
            spending_limit: invitation.metadata?.spending_limit,
            joined_company_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUserId)

      if (updateUserError) {
        console.error('User update error:', updateUserError)
        return NextResponse.json(
          { error: { message: 'Failed to join company' } },
          { status: 500 }
        )
      }
    } else {
      // Handle new user invitation (they need to sign up first)
      return NextResponse.json(
        { error: { message: 'Please create an account first to accept this invitation' } },
        { status: 400 }
      )
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabase
      .from('employee_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (acceptError) {
      console.error('Invitation acceptance error:', acceptError)
      return NextResponse.json(
        { error: { message: 'Failed to accept invitation' } },
        { status: 500 }
      )
    }

    // Log the acceptance
    await supabase
      .from('audit_logs')
      .insert({
        user_id: currentUser?.id || null,
        action: 'invitation_accepted',
        resource_type: 'employee_invitation',
        resource_id: invitation.id,
        details: {
          invitationId: invitation.id,
          companyId: invitation.company_id,
          invitedBy: invitation.invited_by,
          email: invitation.email,
          invitationType
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      companyId: invitation.company_id
    })

  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
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
