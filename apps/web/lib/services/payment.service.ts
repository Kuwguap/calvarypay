/**
 * Payment Service
 * Handles payment processing, transactions, and payment history
 */

import { apiClient, PaginationResult } from '../api';

export interface Transaction {
  id: string;
  userId: string;
  reference: string;
  amount: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'USD';
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  channel: 'card' | 'bank_transfer' | 'ussd' | 'qr' | 'mobile_money';
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInitiateRequest {
  amount: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'USD';
  channel: 'card' | 'bank_transfer' | 'ussd' | 'qr' | 'mobile_money';
  description?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitiateResponse {
  transactionId: string;
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export interface TransactionQuery {
  page?: number;
  limit?: number;
  status?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  successRate: number;
  averageAmount: number;
}

export class PaymentService {
  /**
   * Initiate a new payment
   */
  async initiatePayment(
    request: PaymentInitiateRequest,
    idempotencyKey?: string
  ): Promise<PaymentInitiateResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return apiClient.post<PaymentInitiateResponse>('/payments/initiate', request, {
      headers,
    });
  }

  /**
   * Get user transactions with pagination and filtering
   */
  async getTransactions(query?: TransactionQuery): Promise<PaginationResult<Transaction>> {
    const params = new URLSearchParams();
    
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.status) params.append('status', query.status);
    if (query?.currency) params.append('currency', query.currency);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `/payments/transactions?${queryString}` : '/payments/transactions';

    return apiClient.get<PaginationResult<Transaction>>(url);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    return apiClient.get<Transaction>(`/payments/transactions/${transactionId}`);
  }

  /**
   * Verify transaction status
   */
  async verifyTransaction(reference: string): Promise<Transaction> {
    return apiClient.get<Transaction>(`/payments/verify/${reference}`);
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(
    startDate?: string,
    endDate?: string,
    currency?: string
  ): Promise<PaymentStats> {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (currency) params.append('currency', currency);

    const queryString = params.toString();
    const url = queryString ? `/payments/stats?${queryString}` : '/payments/stats';

    return apiClient.get<PaymentStats>(url);
  }

  /**
   * Cancel pending transaction
   */
  async cancelTransaction(transactionId: string): Promise<Transaction> {
    return apiClient.post<Transaction>(`/payments/transactions/${transactionId}/cancel`);
  }

  /**
   * Retry failed transaction
   */
  async retryTransaction(transactionId: string): Promise<PaymentInitiateResponse> {
    return apiClient.post<PaymentInitiateResponse>(`/payments/transactions/${transactionId}/retry`);
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    return apiClient.get<string[]>('/payments/currencies');
  }

  /**
   * Get supported payment channels
   */
  async getSupportedChannels(): Promise<string[]> {
    return apiClient.get<string[]>('/payments/channels');
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(transactionId: string): Promise<Blob> {
    return apiClient.get<Blob>(`/payments/transactions/${transactionId}/receipt`, {
      responseType: 'blob',
    } as any);
  }

  /**
   * Export transactions to CSV
   */
  async exportTransactions(query?: TransactionQuery): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (query?.status) params.append('status', query.status);
    if (query?.currency) params.append('currency', query.currency);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    const queryString = params.toString();
    const url = queryString ? `/payments/export?${queryString}` : '/payments/export';

    return apiClient.get<Blob>(url, {
      responseType: 'blob',
    } as any);
  }

  /**
   * Generate payment link
   */
  async generatePaymentLink(request: PaymentInitiateRequest): Promise<{
    link: string;
    expiresAt: string;
  }> {
    return apiClient.post<{
      link: string;
      expiresAt: string;
    }>('/payments/generate-link', request);
  }

  /**
   * Get payment link details
   */
  async getPaymentLink(linkId: string): Promise<{
    id: string;
    amount: number;
    currency: string;
    description: string;
    status: string;
    expiresAt: string;
    createdAt: string;
  }> {
    return apiClient.get(`/payments/links/${linkId}`);
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
