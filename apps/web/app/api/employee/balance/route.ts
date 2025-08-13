/**
 * Employee Balance API
 * Allows employees to check their balance and transaction history
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { EmployeeBalanceService } from '@/lib/services/employee-balance.service'

export async function GET(request: NextRequest) {
  try {
    console.log('💳 Employee Balance API: Starting balance fetch...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('💳 Employee Balance API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user is an employee
    if (!verifyPaymentRole(authResult.user, ['employee'])) {
      console.log('💳 Employee Balance API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only employees can access balance information')
    }

    const { user } = authResult
    console.log('💳 Employee Balance API: Fetching balance for employee:', user.userId)

    // Get employee balance
    const balance = EmployeeBalanceService.getEmployeeBalance(user.userId)
    
    // Get recent transactions
    const recentTransactions = EmployeeBalanceService.getTransactionsForUser(user.userId, 20)

    console.log('💳 Employee Balance API: Balance retrieved:', {
      balance: balance.balance,
      totalReceived: balance.totalReceived,
      totalSpent: balance.totalSpent,
      pendingAllocations: balance.pendingAllocations.length,
      recentTransactions: recentTransactions.length
    })

    return NextResponse.json({
      success: true,
      data: {
        balance,
        recentTransactions,
        summary: {
          availableBalance: balance.balance,
          totalReceived: balance.totalReceived,
          totalSpent: balance.totalSpent,
          pendingAmount: balance.pendingAllocations.reduce((sum, a) => sum + a.amount, 0),
          transactionCount: recentTransactions.length
        }
      }
    })

  } catch (error) {
    console.error('💳 Employee Balance API: Failed to fetch balance:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch balance'
        }
      },
      { status: 500 }
    )
  }
} 