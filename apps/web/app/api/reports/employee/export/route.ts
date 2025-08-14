import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Employee Export API: Starting export generation...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Employee Export API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to access exports
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('📊 Employee Export API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can access employee exports')
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') || 'csv'

    if (!employeeId) {
      return NextResponse.json(
        { error: { message: 'Employee ID is required' } },
        { status: 400 }
      )
    }

    console.log('📊 Employee Export API: Generating export for employee:', employeeId, 'format:', format)

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
      console.error('📊 Employee Export API: Error fetching transfers:', transfersError)
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
      console.error('📊 Employee Export API: Error fetching employee details:', employeeError)
      return NextResponse.json(
        { error: { message: 'Employee not found' } },
        { status: 404 }
      )
    }

    // Format data for export
    const exportData = transfers?.map(transfer => ({
      'Transfer ID': transfer.id,
      'Reference': transfer.transfer_reference,
      'Amount': (transfer.amount_minor / 100).toFixed(2),
      'Currency': transfer.currency,
      'Status': transfer.status,
      'Type': transfer.transfer_type,
      'Reason': transfer.reason || '',
      'Description': transfer.description || '',
      'Created Date': new Date(transfer.created_at).toLocaleDateString(),
      'Processed Date': transfer.processed_at ? new Date(transfer.processed_at).toLocaleDateString() : '',
      'Fee': transfer.transfer_fee_minor ? (transfer.transfer_fee_minor / 100).toFixed(2) : '0.00',
      'Net Amount': transfer.net_amount_minor ? (transfer.net_amount_minor / 100).toFixed(2) : '0.00',
      'Direction': transfer.recipient_id === employeeId ? 'Incoming' : 'Outgoing'
    })) || []

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${employee.first_name}_${employee.last_name}_transfers_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      return NextResponse.json({
        success: true,
        message: 'CSV export completed',
        downloadUrl: url
      })
    } else {
      // Return JSON format
      return NextResponse.json({
        employee: {
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          role: employee.role,
          department: employee.department
        },
        export: {
          format: 'json',
          totalTransfers: exportData.length,
          period: {
            startDate: startDate || 'all',
            endDate: endDate || 'all'
          }
        },
        data: exportData
      })
    }

  } catch (error) {
    console.error('📊 Employee Export API: Failed to generate export:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate employee export'
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
