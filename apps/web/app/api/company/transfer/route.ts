/**
 * Company Transfer API
 * Allows employees to transfer money to other employees within the company
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { paystackService } from '@/lib/services/paystack.service'
import { supabaseService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🏢 Company Transfer API: Starting employee transfer...')
    
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('🏢 Company Transfer API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to make transfers
    if (!verifyPaymentRole(authResult.user, ['employee', 'merchant', 'admin'])) {
      console.log('🏢 Company Transfer API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Insufficient permissions for transfer operations')
    }

    const { user } = authResult
    const body = await request.json()
    console.log('🏢 Company Transfer API: Request body:', body)

    // Validate request body
    const { recipientId, amount, currency, purpose, description } = body

    if (!recipientId) {
      return NextResponse.json(
        { error: { message: 'Recipient ID is required' } },
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

    // Prevent self-transfer
    if (recipientId === user.userId) {
      return NextResponse.json(
        { error: { message: 'Cannot transfer money to yourself' } },
        { status: 400 }
      )
    }

    // Verify recipient exists and is an employee
    console.log('🏢 Company Transfer API: Verifying recipient...')
    const { data: recipientData, error: recipientError } = await supabaseService.client
      .from('calvary_users')
      .select('id, email, first_name, last_name, role')
      .eq('id', recipientId)
      .eq('role', 'employee')
      .single()

    if (recipientError || !recipientData) {
      return NextResponse.json(
        { error: { message: 'Invalid recipient ID or recipient not found' } },
        { status: 400 }
      )
    }

    console.log('🏢 Company Transfer API: Recipient verified:', {
      id: recipientData.id,
      email: recipientData.email,
      name: `${recipientData.first_name} ${recipientData.last_name}`
    })

    // Fetch sender data from database
    console.log('🏢 Company Transfer API: Fetching sender data...')
    const { data: senderData, error: senderError } = await supabaseService.client
      .from('calvary_users')
      .select('email, first_name, last_name')
      .eq('id', user.userId)
      .single()

    if (senderError || !senderData) {
      console.error('🏢 Company Transfer API: Failed to fetch sender data:', senderError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch sender information' } },
        { status: 500 }
      )
    }

    // Validate sender email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(senderData.email)) {
      console.error('🏢 Company Transfer API: Invalid email format in database:', senderData.email)
      return NextResponse.json(
        { error: { message: 'Invalid email format in sender profile' } },
        { status: 400 }
      )
    }

    // Generate unique reference
    const reference = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('🏢 Company Transfer API: Generated reference:', reference)

    // Create transfer record
    const transferData = {
      id: reference,
      sender_id: user.userId,
      recipient_id: recipientId,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      purpose: purpose || 'employee_transfer',
      description: description || 'Employee-to-employee transfer',
      status: 'pending',
      created_at: new Date().toISOString(),
      company_id: user.userId, // Assuming sender's company
      transfer_type: 'employee_to_employee'
    }

    console.log('🏢 Company Transfer API: Transfer data prepared:', transferData)

    // TODO: Create transfers table when ready
    // For now, log the transfer and return success
    console.log('🏢 Company Transfer API: Transfer would be created:', transferData)

    // Log the transfer attempt
    console.log('Employee transfer initiated:', {
      senderId: user.userId,
      senderName: `${senderData.first_name} ${senderData.last_name}`,
      recipientId,
      recipientName: `${recipientData.first_name} ${recipientData.last_name}`,
      amount,
      currency,
      purpose: purpose || 'employee_transfer',
      reference,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: {
        transferId: reference,
        senderId: user.userId,
        recipientId,
        amount,
        currency,
        purpose: purpose || 'employee_transfer',
        status: 'initiated',
        message: `Transfer of ${amount} ${currency} initiated to ${recipientData.first_name} ${recipientData.last_name}`
      },
    })

  } catch (error) {
    console.error('🏢 Company Transfer API: Transfer failed:', error)
    return NextResponse.json(
      { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to initiate transfer' 
        } 
      }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🏢 Company Transfer API: Fetching transfer history...')
    
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to view transfers
    if (!verifyPaymentRole(authResult.user, ['employee', 'merchant', 'admin'])) {
      return createForbiddenResponse('Insufficient permissions to view transfers')
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')

    // TODO: Implement when transfers table is created
    // For now, return mock data
    const mockTransfers = [
      {
        id: 'mock_transfer_1',
        sender_id: user.userId,
        recipient_id: 'ff0d6f6f-3f2c-4c91-8c4a-e8d186d20718',
        amount: 500,
        currency: 'GHS',
        purpose: 'employee_transfer',
        status: 'completed',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        transfer_type: 'employee_to_employee'
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        transfers: mockTransfers,
        pagination: {
          page,
          limit,
          total: mockTransfers.length,
          totalPages: 1
        }
      }
    })

  } catch (error) {
    console.error('🏢 Company Transfer API: Failed to fetch transfers:', error)
    return NextResponse.json(
      { error: { message: 'Failed to fetch transfer history' } },
      { status: 500 }
    )
  }
} 