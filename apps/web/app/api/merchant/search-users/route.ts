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
    const email = searchParams.get('email')

    if (!email || email.length < 3) {
      return NextResponse.json({
        users: []
      })
    }

    // Get merchant's company ID
    const companyId = user.userId

    // Search for users by email
    const { data: users, error: searchError } = await supabase
      .from('calvary_users')
      .select('id, email, first_name, last_name, role, is_active')
      .ilike('email', `%${email}%`)
      .eq('role', 'employee')
      .eq('is_active', true)
      .limit(10)

    if (searchError) {
      console.error('User search error:', searchError)
      return NextResponse.json(
        { error: { message: 'Failed to search users' } },
        { status: 500 }
      )
    }

    // Format results with detailed status information
    const formattedUsers = users.map(user => {
      let status = 'available';
      let statusMessage = 'Available for invitation';

      // Since company_id column doesn't exist in current schema, 
      // we'll assume all users are available for invitation
      // TODO: Add company_id column to calvary_users table when implementing company relationships

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        status,
        statusMessage,
        isAvailable: status === 'available',
        canInvite: status === 'available'
      };
    });

    // TODO: Check for existing invitations when employee_invitations table is created
    // For now, all users appear as available since we can't check invitation status

    // Filter out users that can't be invited (but show them for information)
    const availableUsers = formattedUsers.filter(user => user.canInvite);
    const unavailableUsers = formattedUsers.filter(user => !user.canInvite);

    // Log the search
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'user_search',
        resource_type: 'user_search',
        resource_id: 'employee_search',
        details: {
          searchTerm: email,
          resultsCount: formattedUsers.length,
          companyId
        }
      })

    return NextResponse.json({
      users: formattedUsers, // Return all users with status information
      availableUsers,
      unavailableUsers,
      total: formattedUsers.length,
      availableCount: availableUsers.length,
      unavailableCount: unavailableUsers.length
    })

  } catch (error) {
    console.error('User search error:', error)
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
