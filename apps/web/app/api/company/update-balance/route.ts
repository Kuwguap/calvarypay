/**
 * Company Balance Update API
 * Updates company account balance after successful deposits
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { supabaseService } from '@/lib/supabase'
import { BalanceService } from '@/lib/services/balance.service'

export async function POST(request: NextRequest) {
  try {
    console.log('💰 Company Balance API: Starting balance update...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('💰 Company Balance API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to update balances
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('💰 Company Balance API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can update account balances')
    }

    const { user } = authResult
    const body = await request.json()
    console.log('💰 Company Balance API: Request body:', body)

    // Validate request body
    const { amount, currency, reference, transactionId, purpose } = body

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

    if (!reference) {
      return NextResponse.json(
        { error: { message: 'Payment reference is required' } },
        { status: 400 }
      )
    }

    console.log('💰 Company Balance API: Updating balance for company:', user.userId)

    // Update balance using the shared service
    const balanceUpdate = BalanceService.updateBalance(
      user.userId,
      parseFloat(amount),
      currency.toUpperCase(),
      reference,
      purpose || 'deposit',
      'credit'
    )

    console.log('Company balance updated:', balanceUpdate)

    return NextResponse.json({
      success: true,
      data: {
        companyId: user.userId,
        previousBalance: balanceUpdate.previousBalance,
        newBalance: balanceUpdate.newBalance,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        reference,
        purpose: purpose || 'deposit',
        status: 'balance_updated',
        message: `Successfully added ${amount} ${currency} to company account. New balance: ${balanceUpdate.newBalance} ${currency}`,
        timestamp: new Date().toISOString()
      },
    })

  } catch (error) {
    console.error('💰 Company Balance API: Balance update failed:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to update account balance'
        }
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('💰 Company Balance API: Fetching account balance...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to view balances
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      return createForbiddenResponse('Insufficient permissions to view account balance')
    }

    const { user } = authResult

    // Get balance from the shared service
    const balanceData = BalanceService.getBalance(user.userId)
    
    // Get debug info for troubleshooting
    const debugInfo = BalanceService.getDebugInfo()
    
    console.log('💰 Company Balance API: Balance data retrieved:', {
      userId: user.userId,
      balanceData,
      debugInfo: {
        totalCompanies: debugInfo.totalCompanies,
        fileExists: debugInfo.fileExists,
        filePath: debugInfo.filePath
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        balance: balanceData
      }
    })

  } catch (error) {
    console.error('💰 Company Balance API: Failed to fetch balance:', error)
    return NextResponse.json(
      { error: { message: 'Failed to fetch account balance' } },
      { status: 500 }
    )
  }
} 