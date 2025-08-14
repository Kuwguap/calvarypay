import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Employee Reports API: Starting report generation...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Employee Reports API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to access reports
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('📊 Employee Reports API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can access employee reports')
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!employeeId) {
      return NextResponse.json(
        { error: { message: 'Employee ID is required' } },
        { status: 400 }
      )
    }

    console.log('📊 Employee Reports API: Generating report for employee:', employeeId)

    // Build query for employee_transfers
    let query = supabaseService.client
      .from('employee_transfers')
      .select(`
        id,
        transfer_reference,
        amount_minor,
        currency,
        status,
        transfer_type,
        reason,
        description,
        created_at,
        processed_at,
        transfer_fee_minor,
        net_amount_minor,
        sender_id,
        recipient_id,
        metadata
      `)
      .or(`sender_id.eq.${employeeId},recipient_id.eq.${employeeId}`)

    // Add date filters if provided
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Execute query
    const { data: transfers, error: transfersError } = await query.order('created_at', { ascending: false })

    if (transfersError) {
      console.error('📊 Employee Reports API: Error fetching transfers:', transfersError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch employee transfers' } },
        { status: 500 }
      )
    }

    // Get employee details
    const { data: employee, error: employeeError } = await supabaseService.client
      .from('calvary_users')
      .select('id, first_name, last_name, email, role, department')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      console.error('📊 Employee Reports API: Error fetching employee details:', employeeError)
      return NextResponse.json(
        { error: { message: 'Employee not found' } },
        { status: 404 }
      )
    }

    // Calculate report statistics
    const totalTransfers = transfers?.length || 0
    const totalAmount = transfers?.reduce((sum, t) => sum + (t.amount_minor / 100), 0) || 0
    const completedTransfers = transfers?.filter(t => t.status === 'completed').length || 0
    const pendingTransfers = transfers?.filter(t => t.status === 'pending').length || 0
    const failedTransfers = transfers?.filter(t => t.status === 'failed').length || 0
    const successRate = totalTransfers > 0 ? (completedTransfers / totalTransfers) * 100 : 0

    // Calculate fees
    const totalFees = transfers?.reduce((sum, t) => sum + (t.transfer_fee_minor ? t.transfer_fee_minor / 100 : 0), 0) || 0

    // Format transfers for response
    const formattedTransfers = transfers?.map(transfer => ({
      id: transfer.id,
      reference: transfer.transfer_reference,
      amount: transfer.amount_minor / 100,
      currency: transfer.currency,
      status: transfer.status,
      type: transfer.transfer_type,
      reason: transfer.reason,
      description: transfer.description,
      createdAt: transfer.created_at,
      processedAt: transfer.processed_at,
      fee: transfer.transfer_fee_minor ? transfer.transfer_fee_minor / 100 : 0,
      netAmount: transfer.net_amount_minor ? transfer.net_amount_minor / 100 : 0,
      isIncoming: transfer.recipient_id === employeeId,
      isOutgoing: transfer.sender_id === employeeId
    })) || []

    console.log('📊 Employee Reports API: Report generated successfully')

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        role: employee.role,
        department: employee.department
      },
      report: {
        totalTransfers,
        totalAmount,
        completedTransfers,
        pendingTransfers,
        failedTransfers,
        successRate,
        totalFees,
        period: {
          startDate: startDate || 'all',
          endDate: endDate || 'all'
        }
      },
      transfers: formattedTransfers
    })

  } catch (error) {
    console.error('📊 Employee Reports API: Failed to generate report:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate employee report'
        }
      },
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
