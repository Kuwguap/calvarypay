import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { BalanceService } from '@/lib/services/balance.service'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Dashboard Stats API: Starting stats fetch...')

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('📊 Dashboard Stats API: No Bearer token found')
      return createUnauthorizedResponse('Authorization token required')
    }

    const token = authHeader.substring(7)
    console.log('📊 Dashboard Stats API: Token extracted, length:', token.length)

    // Get user from token
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Dashboard Stats API: Authentication failed')
      return createUnauthorizedResponse('Authentication failed')
    }

    const user = authResult.user
    console.log('📊 Dashboard Stats API: Fetching stats for user:', user.userId)

    // Fetch real data from database
    try {
      // Get total employees (using existing columns)
      const { data: employees, error: employeesError } = await supabaseService.client
        .from('calvary_users')
        .select('id, is_active, role')
        .eq('role', 'employee')

      if (employeesError) {
        console.error('📊 Dashboard Stats API: Error fetching employees:', employeesError)
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
      }

      // Get company balance
      const balanceData = BalanceService.getBalance(user.userId)
      const accountBalance = balanceData?.balance || 0

      // Get employee transfers (this might be empty for new merchants)
      let { data: transfers, error: transfersError } = await supabaseService.client
        .from('employee_transfers')
        .select('*')
        .eq('sender_company_id', user.userId)

      if (transfersError) {
        console.error('📊 Dashboard Stats API: Error fetching transfers:', transfersError)
        // Don't return error, just set transfers to empty array
        transfers = []
      }

      // Calculate real statistics using existing columns
      const activeEmployees = employees?.filter(emp => emp.is_active === true).length || 0
      const totalTransactions = transfers?.length || 0
      
      // Calculate transaction breakdown
      const completed = transfers?.filter(t => t.status === 'completed').length || 0
      const pending = transfers?.filter(t => t.status === 'pending').length || 0
      const failed = transfers?.filter(t => t.status === 'failed').length || 0

      // Calculate amounts (convert from minor units to major units)
      const totalRevenue = transfers?.reduce((sum, t) => sum + ((t.amount_minor || 0) / 100), 0) || 0
      const totalTransferVolume = transfers?.reduce((sum, t) => sum + ((t.amount_minor || 0) / 100), 0) || 0
      const totalFeesCollected = transfers?.reduce((sum, t) => sum + ((t.transfer_fee_minor || 0) / 100), 0) || 0

      // Calculate success rate
      const successRate = totalTransactions > 0 ? Math.round((completed / totalTransactions) * 100) : 100 // 100% if no transactions

      // Calculate monthly growth (placeholder for now)
      const monthlyGrowth = 0

      // Calculate average transaction amount
      const averageTransactionAmount = totalTransactions > 0 ? totalTransferVolume / totalTransactions : 0

      // Calculate fee percentage
      const feePercentage = totalTransferVolume > 0 ? (totalFeesCollected / totalTransferVolume) * 100 : 0

      // Get department breakdown (using placeholder since department column doesn't exist yet)
      const departmentStats = {
        'General': { count: totalTransactions, amount: totalTransferVolume, employees: activeEmployees }
      }

      // Log the data being returned for debugging
      console.log('📊 Dashboard Stats API: Data summary:', {
        activeEmployees,
        totalTransactions,
        accountBalance,
        transfersFound: transfers?.length || 0,
        transfersError: transfersError?.message || 'none'
      })

      const realStats = {
        totalTransactions,
        totalRevenue,
        totalTransferVolume,
        totalFeesCollected,
        activeEmployees,
        pendingApprovals: pending,
        successRate,
        monthlyGrowth,
        accountBalance,
        averageTransactionAmount,
        feePercentage,
        transactionBreakdown: {
          completed,
          pending,
          failed
        },
        byDepartment: departmentStats
      }

      console.log('📊 Dashboard Stats API: Final stats object:', {
        accountBalance: realStats.accountBalance,
        totalTransactions: realStats.totalTransactions,
        activeEmployees: realStats.activeEmployees
      })

      console.log('📊 Dashboard Stats API: Returning real stats:', realStats)
      return NextResponse.json({
        success: true,
        stats: realStats
      })

    } catch (dbError) {
      console.error('📊 Dashboard Stats API: Database error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

  } catch (error) {
    console.error('📊 Dashboard Stats API: Unexpected error:', error)
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
