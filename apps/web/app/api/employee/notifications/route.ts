/**
 * Employee Notifications API
 * Provides notifications for employees including budget allocations
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { EmployeeBalanceService } from '@/lib/services/employee-balance.service'

export async function GET(request: NextRequest) {
  try {
    console.log('🔔 Employee Notifications API: Starting notifications fetch...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('🔔 Employee Notifications API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user is an employee
    if (!verifyPaymentRole(authResult.user, ['employee'])) {
      console.log('🔔 Employee Notifications API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only employees can access notifications')
    }

    const { user } = authResult
    console.log('🔔 Employee Notifications API: Fetching notifications for employee:', user.userId)

    // Get pending budget allocations
    const pendingAllocations = EmployeeBalanceService.getPendingAllocations(user.userId)
    
    // Get recent transactions for this employee
    const recentTransactions = EmployeeBalanceService.getTransactionsForUser(user.userId, 10)

    // Convert allocations to notifications
    const allocationNotifications = pendingAllocations.map(allocation => ({
      id: allocation.allocationId,
      type: 'budget_allocation',
      title: 'New Budget Allocation',
      message: `You have received a budget allocation of ${allocation.amount} ${allocation.currency} for ${allocation.budgetType}`,
      description: allocation.description,
      amount: allocation.amount,
      currency: allocation.currency,
      budgetType: allocation.budgetType,
      timestamp: allocation.timestamp,
      status: 'pending',
      actions: ['accept', 'reject'],
      metadata: {
        allocationId: allocation.allocationId,
        companyId: allocation.companyId,
        allocatedBy: allocation.allocatedBy,
        expiryDate: allocation.expiryDate
      }
    }))

    // Convert recent transactions to notifications
    const transactionNotifications = recentTransactions
      .filter(t => t.status === 'completed' && t.toUserId === user.userId)
      .slice(0, 5)
      .map(transaction => ({
        id: transaction.transactionId,
        type: 'transaction_completed',
        title: 'Transaction Completed',
        message: `${transaction.description}`,
        amount: transaction.amount,
        currency: transaction.currency,
        timestamp: transaction.timestamp,
        status: 'info',
        actions: [],
        metadata: {
          transactionId: transaction.transactionId,
          fromUserId: transaction.fromUserId,
          reference: transaction.reference
        }
      }))

    // Combine all notifications
    const allNotifications = [
      ...allocationNotifications,
      ...transactionNotifications
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    console.log('🔔 Employee Notifications API: Found notifications:', {
      total: allNotifications.length,
      pendingAllocations: allocationNotifications.length,
      recentTransactions: transactionNotifications.length
    })

    return NextResponse.json({
      success: true,
      data: {
        notifications: allNotifications,
        summary: {
          total: allNotifications.length,
          pendingAllocations: allocationNotifications.length,
          unreadCount: allocationNotifications.length,
          totalPendingAmount: pendingAllocations.reduce((sum, a) => sum + a.amount, 0)
        }
      }
    })

  } catch (error) {
    console.error('🔔 Employee Notifications API: Failed to fetch notifications:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch notifications'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Employee Notifications API: Processing notification action...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    if (!verifyPaymentRole(authResult.user, ['employee'])) {
      return createForbiddenResponse('Only employees can process notifications')
    }

    const { user } = authResult
    const body = await request.json()
    console.log('🔔 Employee Notifications API: Request body:', body)

    const { allocationId, action } = body

    if (!allocationId) {
      return NextResponse.json(
        { error: { message: 'Allocation ID is required' } },
        { status: 400 }
      )
    }

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: { message: 'Valid action (accept/reject) is required' } },
        { status: 400 }
      )
    }

    console.log('🔔 Employee Notifications API: Processing action:', { allocationId, action })

    let result: boolean
    if (action === 'accept') {
      result = EmployeeBalanceService.acceptBudgetAllocation(user.userId, allocationId)
    } else {
      result = EmployeeBalanceService.rejectBudgetAllocation(user.userId, allocationId)
    }

    if (!result) {
      return NextResponse.json(
        { error: { message: 'Failed to process allocation. It may have already been processed or not found.' } },
        { status: 400 }
      )
    }

    // Get updated employee balance
    const updatedBalance = EmployeeBalanceService.getEmployeeBalance(user.userId)

    console.log('🔔 Employee Notifications API: Action processed successfully:', {
      action,
      allocationId,
      newBalance: updatedBalance.balance
    })

    return NextResponse.json({
      success: true,
      data: {
        action,
        allocationId,
        message: `Budget allocation ${action}ed successfully`,
        updatedBalance,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('🔔 Employee Notifications API: Failed to process notification action:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to process notification action'
        }
      },
      { status: 500 }
    )
  }
} 