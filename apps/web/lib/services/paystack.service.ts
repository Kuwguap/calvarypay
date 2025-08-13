/**
 * Paystack Service for CalvaryPay
 * Handles deposits, transfers, and payment processing
 */

const PAYSTACK_SECRET_KEY = 'sk_test_7b452e6eaa3bf7ac690c073db7372527a02a18d2'
const PAYSTACK_PUBLIC_KEY = 'pk_test_144044a9d8365c7f96080135e485ce9eb0b174fa'
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export interface PaystackTransaction {
  id: string
  reference: string
  amount: number
  currency: string
  status: 'pending' | 'success' | 'failed' | 'abandoned'
  gateway_response: string
  channel: string
  paid_at: string | null
  created_at: string
  updated_at: string
  metadata: {
    custom_fields: Array<{
      display_name: string
      variable_name: string
      value: string
    }>
    referrer: string
  }
}

export interface PaystackTransfer {
  id: string
  domain: string
  amount: number
  currency: string
  source: string
  reason: string
  recipient: number
  status: 'pending' | 'success' | 'failed'
  transfer_code: string
  created_at: string
  updated_at: string
}

export interface DepositRequest {
  amount: number
  currency: string
  email: string
  reference: string
  metadata: {
    userId: string
    userRole: string
    companyId?: string
    purpose: 'deposit' | 'transfer'
    recipientId?: string
    recipientEmail?: string
  }
}

export interface TransferRequest {
  amount: number
  currency: string
  recipientId: string
  recipientEmail: string
  reason: string
  metadata: {
    senderId: string
    senderRole: string
    companyId: string
  }
}

export class PaystackService {
  private secretKey: string
  private publicKey: string
  private baseUrl: string

  constructor() {
    this.secretKey = PAYSTACK_SECRET_KEY
    this.publicKey = PAYSTACK_PUBLIC_KEY
    this.baseUrl = PAYSTACK_BASE_URL
  }

  /**
   * Initialize a deposit transaction
   */
  async initializeDeposit(depositData: DepositRequest): Promise<{
    authorizationUrl: string
    reference: string
    accessCode: string
  }> {
    try {
      console.log('🔗 Paystack: Initializing deposit with data:', {
        amount: depositData.amount,
        email: depositData.email,
        reference: depositData.reference,
        currency: depositData.currency
      })

      // Validate email format before sending to Paystack
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(depositData.email)) {
        throw new Error(`Invalid email format: ${depositData.email}`)
      }

      const requestBody = {
        amount: depositData.amount * 100, // Convert to smallest currency unit (pesewas for GHS)
        email: depositData.email,
        reference: depositData.reference,
        currency: depositData.currency,
        metadata: depositData.metadata,
        callback_url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/dashboard/payment/callback`,
      }

      console.log('🔗 Paystack: Sending request to:', `${this.baseUrl}/transaction/initialize`)
      console.log('🔗 Paystack: Request body:', requestBody)

      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🔗 Paystack: Response status:', response.status)
      console.log('🔗 Paystack: Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json()
        console.error('🔗 Paystack: Error response:', errorData)
        throw new Error(errorData.message || `Paystack API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔗 Paystack: Success response:', data)
      
      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
        accessCode: data.data.access_code,
      }
    } catch (error) {
      console.error('🔗 Paystack: Deposit initialization failed:', error)
      throw error
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<PaystackTransaction> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to verify transaction')
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Paystack transaction verification failed:', error)
      throw error
    }
  }

  /**
   * Create a transfer recipient
   */
  async createTransferRecipient(
    accountNumber: string,
    bankCode: string,
    accountName: string
  ): Promise<{ recipient_code: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/transferrecipient`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'GHS', // Default to GHS for Ghana
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create transfer recipient')
      }

      const data = await response.json()
      return { recipient_code: data.data.recipient_code }
    } catch (error) {
      console.error('Paystack transfer recipient creation failed:', error)
      throw error
    }
  }

  /**
   * Initiate a transfer
   */
  async initiateTransfer(transferData: TransferRequest): Promise<PaystackTransfer> {
    try {
      // First create recipient if not exists
      const recipient = await this.createTransferRecipient(
        transferData.recipientEmail, // Using email as account number for demo
        'GH001', // Ghana bank code for demo
        transferData.recipientEmail.split('@')[0] // Using email prefix as name
      )

      const response = await fetch(`${this.baseUrl}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: transferData.amount * 100, // Convert to pesewas for GHS
          recipient: recipient.recipient_code,
          reason: transferData.reason,
          currency: transferData.currency,
          metadata: transferData.metadata,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to initiate transfer')
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Paystack transfer initiation failed:', error)
      throw error
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferCode: string): Promise<PaystackTransfer> {
    try {
      const response = await fetch(`${this.baseUrl}/transfer/${transferCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get transfer status')
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Paystack transfer status check failed:', error)
      throw error
    }
  }

  /**
   * Get available banks
   */
  async getBanks(): Promise<Array<{ code: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/bank`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get banks')
      }

      const data = await response.json()
      return data.data.map((bank: any) => ({
        code: bank.code,
        name: bank.name,
      }))
    } catch (error) {
      console.error('Paystack banks fetch failed:', error)
      // Return default banks for demo - Ghanaian banks
      return [
        { code: 'GH001', name: 'Bank of Ghana' },
        { code: 'GH002', name: 'Ghana Commercial Bank' },
        { code: 'GH003', name: 'Agricultural Development Bank' },
        { code: 'GH004', name: 'National Investment Bank' },
        { code: 'GH005', name: 'HFC Bank' },
        { code: 'GH006', name: 'CAL Bank' },
        { code: 'GH007', name: 'Fidelity Bank Ghana' },
        { code: 'GH008', name: 'Zenith Bank Ghana' },
        { code: 'GH009', name: 'Stanbic Bank Ghana' },
        { code: 'GH010', name: 'Ecobank Ghana' },
        { code: 'GH011', name: 'Access Bank Ghana' },
        { code: 'GH012', name: 'UBA Ghana' },
        { code: 'GH013', name: 'GT Bank Ghana' },
        { code: 'GH014', name: 'First National Bank Ghana' },
        { code: 'GH015', name: 'Republic Bank Ghana' },
      ]
    }
  }

  /**
   * Get public key for frontend
   */
  getPublicKey(): string {
    return this.publicKey
  }
}

// Export singleton instance
export const paystackService = new PaystackService()

// Export types for use in components
export type { PaystackTransaction, PaystackTransfer, DepositRequest, TransferRequest } 