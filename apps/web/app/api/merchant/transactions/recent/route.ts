import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { EmployeeBalanceService } from '@/lib/services/employee-balance.service'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Merchant Recent Transactions API: Starting comprehensive transaction fetch...')

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('📊 Merchant Recent Transactions API: No Bearer token found')
      return createUnauthorizedResponse('Authorization token required')
    }

    const token = authHeader.substring(7)
    console.log('📊 Merchant Recent Transactions API: Token extracted, length:', token.length)

    // Get user from token
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Merchant Recent Transactions API: Authentication failed')
      return createUnauthorizedResponse('Authentication failed')
    }

    const user = authResult.user
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const days = parseInt(searchParams.get('days') || '30')

    console.log('📊 Merchant Recent Transactions API: Fetching transactions with limit:', limit, 'days:', days)

    // Fetch real data from database
    try {
      // Get employee transfers (simplified query to avoid JOIN issues)
      const { data: transfers, error: transfersError } = await supabaseService.client
        .from('employee_transfers')
        .select('*')
        .eq('sender_company_id', user.userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (transfersError) {
        console.error('📊 Merchant Recent Transactions API: Error fetching transfers:', transfersError)
        return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
      }

      // Get user details separately to avoid JOIN issues
      let senderUsers = []
      let recipientUsers = []
      
      if (transfers && transfers.length > 0) {
        const userIds = [...new Set([
          ...transfers.map(t => t.sender_id).filter(Boolean),
          ...transfers.map(t => t.recipient_id).filter(Boolean)
        ])]
        
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabaseService.client
            .from('calvary_users')
            .select('id, first_name, last_name, email')
            .in('id', userIds)
          
          if (!usersError && users) {
            senderUsers = users
            recipientUsers = users
          }
        }
      }

      // Transform data to match expected format
      const realTransactions = transfers?.map(transfer => {
        const senderUser = senderUsers.find(u => u.id === transfer.sender_id)
        const recipientUser = recipientUsers.find(u => u.id === transfer.recipient_id)
        
        return {
          id: transfer.id,
          reference: transfer.transfer_reference || `TXN-${transfer.id}`,
          type: transfer.transfer_type || 'transfer',
          amount: (transfer.amount_minor || 0) / 100, // Convert from minor units
          currency: transfer.currency || 'GHS',
          status: transfer.status || 'pending',
          description: transfer.description || 'Employee transfer',
          createdAt: transfer.created_at,
          processedAt: transfer.processed_at,
          category: transfer.transfer_type || 'transfer',
          sender: senderUser ? `${senderUser.first_name} ${senderUser.last_name}` : 'Unknown',
          senderEmail: senderUser?.email || 'unknown@example.com',
          senderRole: 'employee',
          recipient: recipientUser ? `${recipientUser.first_name} ${recipientUser.last_name}` : 'Unknown',
          recipientEmail: recipientUser?.email || 'unknown@example.com',
          recipientRole: 'employee',
          transferType: transfer.transfer_type || 'transfer',
          fee: (transfer.transfer_fee_minor || 0) / 100, // Convert from minor units
          netAmount: (transfer.net_amount_minor || 0) / 100, // Convert from minor units
          metadata: transfer.metadata || {},
          department: 'General' // Placeholder since department column doesn't exist yet
        }
      }) || []

      console.log('📊 Merchant Recent Transactions API: Returning real transactions:', realTransactions.length)
      return NextResponse.json({
        success: true,
        transactions: realTransactions
      })

    } catch (dbError) {
      console.error('📊 Merchant Recent Transactions API: Database error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

  } catch (error) {
    console.error('📊 Merchant Recent Transactions API: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
