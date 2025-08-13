/**
 * Company Budget Allocation API
 * Allows merchants/admins to allocate budgets to employees
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { supabaseService } from '@/lib/supabase'
import { EmployeeBalanceService } from '@/lib/services/employee-balance.service'
import { BalanceService } from '@/lib/services/balance.service'

export async function POST(request: NextRequest) {
  try {
    console.log('💼 Budget Allocation API: Starting budget allocation...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('💼 Budget Allocation API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to allocate budgets
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('💼 Budget Allocation API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can allocate budgets')
    }

    const { user } = authResult
    const body = await request.json()
    console.log('💼 Budget Allocation API: Request body:', body)

    // Validate request body
    const { employeeId, amount, currency, budgetType, description, expiryDate } = body

    if (!employeeId) {
      return NextResponse.json(
        { error: { message: 'Employee ID is required' } },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: { message: 'Invalid amount' } },
        { status: 400 }
      )
    }

    if (!currency) {
      return NextResponse.json(
        { error: { message: 'Currency is required' } },
        { status: 400 }
      )
    }

    if (!budgetType) {
      return NextResponse.json(
        { error: { message: 'Budget type is required' } },
        { status: 400 }
      )
    }

    console.log('💼 Budget Allocation API: Validating employee and company balance...')

    // Verify employee exists and is active
    const { data: employee, error: employeeError } = await supabaseService.client
      .from('calvary_users')
      .select('*')
      .eq('id', employeeId)
      .eq('role', 'employee')
      .eq('is_active', true)
      .single()

    if (employeeError || !employee) {
      console.error('💼 Budget Allocation API: Employee not found or inactive:', employeeError)
      return NextResponse.json(
        { error: { message: 'Employee not found or inactive' } },
        { status: 404 }
      )
    }

    // Check if company has sufficient balance
    const companyBalance = BalanceService.getBalance(user.userId)
    if (companyBalance.balance < amount) {
      console.error('💼 Budget Allocation API: Insufficient company balance:', {
        required: amount,
        available: companyBalance.balance
      })
      return NextResponse.json(
        { error: { message: 'Insufficient company balance for this allocation' } },
        { status: 400 }
      )
    }

    console.log('💼 Budget Allocation API: Allocating budget to employee...')

    // Allocate budget to employee
    const allocation = EmployeeBalanceService.allocateBudget(
      user.userId,
      employeeId,
      parseFloat(amount),
      currency.toUpperCase(),
      budgetType,
      description || `Budget allocation: ${budgetType}`,
      user.userId,
      expiryDate
    )

    // Deduct amount from company balance
    const balanceUpdate = BalanceService.updateBalance(
      user.userId,
      parseFloat(amount),
      currency.toUpperCase(),
      allocation.allocationId,
      `Budget allocation to employee: ${employee.email}`,
      'debit'
    )

    console.log('💼 Budget Allocation API: Budget allocated successfully:', {
      allocation,
      balanceUpdate
    })

    return NextResponse.json({
      success: true,
      data: {
        allocation,
        companyBalanceUpdate: balanceUpdate,
        employee: {
          id: employee.id,
          email: employee.email,
          name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
        },
        message: `Successfully allocated ${amount} ${currency} to ${employee.email}`,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('💼 Budget Allocation API: Budget allocation failed:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to allocate budget'
        }
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('💼 Budget Allocation API: Fetching budget allocations...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      return createForbiddenResponse('Insufficient permissions to view budget allocations')
    }

    const { user } = authResult

    // Get all transactions for this company
    const transactions = EmployeeBalanceService.getTransactionsForUser(user.userId, 100)
    const budgetAllocations = transactions.filter(t => t.type === 'budget_allocation')

    console.log('💼 Budget Allocation API: Found budget allocations:', budgetAllocations.length)

    return NextResponse.json({
      success: true,
      data: {
        allocations: budgetAllocations,
        totalAllocations: budgetAllocations.length,
        totalAmount: budgetAllocations.reduce((sum, a) => sum + a.amount, 0)
      }
    })

  } catch (error) {
    console.error('💼 Budget Allocation API: Failed to fetch budget allocations:', error)
    return NextResponse.json(
      { error: { message: 'Failed to fetch budget allocations' } },
      { status: 500 }
    )
  }
} 