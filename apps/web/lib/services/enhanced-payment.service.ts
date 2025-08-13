/**
 * Enhanced Payment Service for CalvaryPay
 * Direct Paystack integration with enhanced security and validation
 */

import { z } from 'zod'
import { supabaseService } from '@/lib/supabase'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'

// Validation schemas
const PaymentInitiateSchema = z.object({
  amount: z.number().positive().max(1000000),
  currency: z.enum(['NGN', 'USD', 'GHS', 'KES', 'ZAR']).default('NGN'),
  channel: z.enum(['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']).optional(),
  description: z.string().max(500).optional(),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
})

// Interfaces
export interface EnhancedPaymentRequest {
  userId: string
  email: string
  amount: number
  currency?: 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR'
  channel?: 'card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer'
  description?: string
  callbackUrl?: string
  metadata?: Record<string, any>
}

export interface PaymentResponse {
  success: boolean
  data?: {
    transactionId: string
    reference: string
    authorizationUrl: string
    accessCode: string
  }
  error?: string
}

export interface PaymentVerificationResult {
  success: boolean
  data?: {
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number
    currency: string
    paidAt: string | null
    channel: string
    transactionId: string
    customerEmail: string
    fees: number | null
  }
  error?: string
}

interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

interface PaystackVerificationResponse {
  status: boolean
  message: string
  data: {
    id: number
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number
    currency: string
    paid_at: string | null
    channel: string
    customer: { email: string }
    fees: number | null
    gateway_response: string
  }
}

export class EnhancedPaymentService {
  private static instance: EnhancedPaymentService
  private readonly paystackSecretKey: string
  private readonly paystackPublicKey: string
  private readonly baseUrl = 'https://api.paystack.co'

  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || ''
    this.paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
    
    if (!this.paystackSecretKey || !this.paystackPublicKey) {
      console.warn('Paystack keys not configured. Payment functionality will be limited.')
    }
  }

  static getInstance(): EnhancedPaymentService {
    if (!EnhancedPaymentService.instance) {
      EnhancedPaymentService.instance = new EnhancedPaymentService()
    }
    return EnhancedPaymentService.instance
  }

  /**
   * Initialize payment with enhanced security and validation
   */
  async initializePayment(request: EnhancedPaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate input
      const validation = enhancedSecurityService.validateAndSanitizeInput(request, PaymentInitiateSchema)
      if (!validation.success) {
        return { success: false, error: `Validation failed: ${validation.errors?.join(', ')}` }
      }

      // Generate unique reference
      const reference = this.generatePaymentReference()
      
      // Convert amount to kobo for NGN
      const amountInKobo = request.currency === 'NGN' ? request.amount * 100 : request.amount

      // Create transaction record
      const transactionId = await this.createTransactionRecord({
        userId: request.userId,
        reference,
        amount: request.amount,
        currency: request.currency || 'NGN',
        status: 'pending',
        description: request.description,
        metadata: request.metadata || {}
      })

      // Prepare Paystack request
      const paystackRequest = {
        email: request.email,
        amount: amountInKobo,
        currency: request.currency || 'NGN',
        reference,
        callback_url: request.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        channels: request.channel ? [request.channel] : undefined,
        metadata: {
          ...request.metadata,
          transaction_id: transactionId,
          user_id: request.userId,
          description: request.description || 'CalvaryPay Transaction'
        }
      }

      // Initialize with Paystack
      const response = await this.makePaystackRequest<PaystackInitializeResponse>(
        '/transaction/initialize',
        'POST',
        paystackRequest
      )

      if (!response.status) {
        await this.updateTransactionStatus(transactionId, 'failed', { error: response.message })
        return { success: false, error: response.message }
      }

      // Update transaction with Paystack data
      await this.updateTransactionRecord(transactionId, {
        paystack_access_code: response.data.access_code,
        authorization_url: response.data.authorization_url
      })

      return {
        success: true,
        data: {
          transactionId,
          reference: response.data.reference,
          authorizationUrl: response.data.authorization_url,
          accessCode: response.data.access_code
        }
      }
    } catch (error) {
      console.error('Payment initialization error:', error)
      return { success: false, error: 'Failed to initialize payment' }
    }
  }

  /**
   * Verify payment with Paystack
   */
  async verifyPayment(reference: string, expectedAmount?: number): Promise<PaymentVerificationResult> {
    try {
      // Make request to Paystack
      const response = await this.makePaystackRequest<PaystackVerificationResponse>(
        `/transaction/verify/${reference}`,
        'GET'
      )

      if (!response.status) {
        return { success: false, error: response.message }
      }

      const { data } = response

      // Verify amount if provided
      if (expectedAmount) {
        const actualAmount = data.currency === 'NGN' ? data.amount / 100 : data.amount
        if (Math.abs(actualAmount - expectedAmount) > 0.01) {
          return { success: false, error: 'Amount mismatch detected' }
        }
      }

      // Update transaction in database
      const transactionId = await this.getTransactionIdByReference(reference)
      if (transactionId) {
        await this.updateTransactionStatus(transactionId, data.status, {
          paystack_id: data.id,
          gateway_response: data.gateway_response,
          paid_at: data.paid_at,
          channel: data.channel,
          fees: data.fees
        })
      }

      return {
        success: true,
        data: {
          status: data.status,
          reference: data.reference,
          amount: data.currency === 'NGN' ? data.amount / 100 : data.amount,
          currency: data.currency,
          paidAt: data.paid_at,
          channel: data.channel,
          transactionId: transactionId || '',
          customerEmail: data.customer.email,
          fees: data.fees ? (data.currency === 'NGN' ? data.fees / 100 : data.fees) : null
        }
      }
    } catch (error) {
      console.error('Payment verification error:', error)
      return { success: false, error: 'Failed to verify payment' }
    }
  }

  /**
   * Handle Paystack webhook
   */
  async handleWebhook(payload: any, signature: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(payload, signature)
      if (!isValid) {
        return { success: false, error: 'Invalid webhook signature' }
      }

      const { event, data } = payload

      switch (event) {
        case 'charge.success':
          await this.handleSuccessfulCharge(data)
          break
        case 'charge.failed':
          await this.handleFailedCharge(data)
          break
        default:
          console.log(`Unhandled webhook event: ${event}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Webhook handling error:', error)
      return { success: false, error: 'Failed to process webhook' }
    }
  }

  // Private helper methods
  private generatePaymentReference(): string {
    const timestamp = Date.now()
    const random = enhancedSecurityService.generateSecureToken(4)
    return `CP_${timestamp}_${random}`.toUpperCase()
  }

  private async makePaystackRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    return response.json()
  }

  private async verifyWebhookSignature(payload: any, signature: string): Promise<boolean> {
    try {
      const data = JSON.stringify(payload)

      if (typeof window !== 'undefined') {
        // Browser environment - use Web Crypto API
        const encoder = new TextEncoder()
        const key = await globalThis.crypto.subtle.importKey(
          'raw',
          encoder.encode(this.paystackSecretKey),
          { name: 'HMAC', hash: 'SHA-512' },
          false,
          ['sign']
        )
        const hashBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(data))
        const hashArray = new Uint8Array(hashBuffer)
        const hash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('')
        return hash === signature
      } else {
        // Node.js environment
        const crypto = require('crypto')
        const hash = crypto
          .createHmac('sha512', this.paystackSecretKey)
          .update(data)
          .digest('hex')
        return hash === signature
      }
    } catch (error) {
      console.error('Webhook signature verification error:', error)
      return false
    }
  }

  private async createTransactionRecord(data: {
    userId: string
    reference: string
    amount: number
    currency: string
    status: string
    description?: string
    metadata: Record<string, any>
  }): Promise<string> {
    const { data: result, error } = await supabaseService.client
      .from('transactions')
      .insert([{
        user_id: data.userId,
        paystack_reference: data.reference,
        amount_minor: data.currency === 'NGN' ? data.amount * 100 : data.amount,
        currency: data.currency,
        status: data.status,
        description: data.description,
        metadata: data.metadata
      }])
      .select('id')
      .single()

    if (error) throw error
    return result.id
  }

  private async updateTransactionRecord(transactionId: string, updates: Record<string, any>): Promise<void> {
    const { error } = await supabaseService.client
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)

    if (error) throw error
  }

  private async updateTransactionStatus(
    transactionId: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const updates: Record<string, any> = { status }
    if (metadata) {
      updates.metadata = metadata
    }

    await this.updateTransactionRecord(transactionId, updates)
  }

  private async getTransactionIdByReference(reference: string): Promise<string | null> {
    const { data, error } = await supabaseService.client
      .from('transactions')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (error) return null
    return data?.id || null
  }

  private async handleSuccessfulCharge(data: any): Promise<void> {
    console.log('Successful charge:', data)
    // Trigger reconciliation process
  }

  private async handleFailedCharge(data: any): Promise<void> {
    console.log('Failed charge:', data)
    // Update transaction status and notify user
  }
}

export const enhancedPaymentService = EnhancedPaymentService.getInstance()
