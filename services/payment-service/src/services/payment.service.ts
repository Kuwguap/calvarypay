import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import {
  supabaseService,
  logger,
  AppError,
  HttpStatusCode,
  Transaction,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaginationQuery,
  PaginationResult
} from '@CalvaryPay/shared';
import { config } from '../config';
import { IdempotencyService } from '../domains/transactions/idempotency.service';

export interface PaymentRequest extends PaymentInitiateRequest {
  userId: string;
}

export interface TransactionQuery extends PaginationQuery {
  status?: string;
  currency?: string;
  provider?: string;
}

export class PaymentService {
  private readonly tableName = 'transactions';
  private readonly idempotencyService = new IdempotencyService();

  async initiatePaymentWithIdempotency(
    request: PaymentRequest,
    idempotencyKey?: string
  ): Promise<PaymentInitiateResponse> {
    try {
      // Handle idempotency if key is provided
      if (idempotencyKey) {
        // Validate idempotency key format
        if (!this.idempotencyService.validateIdempotencyKey(idempotencyKey)) {
          throw new AppError(
            'Invalid idempotency key format',
            HttpStatusCode.BAD_REQUEST,
            'INVALID_IDEMPOTENCY_KEY'
          );
        }

        // Generate request hash for validation
        const requestHash = this.idempotencyService.generateRequestHash(request);

        // Check if this request was already processed
        const existingResult = await this.idempotencyService.checkIdempotency(
          idempotencyKey,
          request.userId,
          requestHash
        );

        if (existingResult) {
          logger.info('Returning cached idempotent response', {
            idempotencyKey,
            userId: request.userId,
            transactionId: existingResult.transactionId
          });
          return existingResult.response;
        }
      }

      // Proceed with normal payment initiation
      const response = await this.initiatePayment(request);

      // Store idempotency record if key was provided
      if (idempotencyKey) {
        const requestHash = this.idempotencyService.generateRequestHash(request);
        await this.idempotencyService.storeIdempotencyRecord(
          idempotencyKey,
          request.userId,
          response.transactionId,
          requestHash,
          response
        );
      }

      return response;

    } catch (error) {
      // Remove idempotency record for failed transactions
      if (idempotencyKey) {
        await this.idempotencyService.removeIdempotencyRecord(idempotencyKey, request.userId);
      }
      throw error;
    }
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentInitiateResponse> {
    try {
      // Generate unique reference
      const reference = `CalvaryPay_${Date.now()}_${uuidv4().substring(0, 8)}`;

      // Create transaction record
      const transaction = await this.createTransaction({
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        reference,
        ...(request.description && { description: request.description }),
        ...(request.metadata && { metadata: request.metadata }),
        status: 'pending',
        provider: 'paystack'
      });

      // Initialize payment with Paystack
      const paystackResponse = await this.initializePaystackPayment({
        amount: request.amount,
        currency: request.currency,
        reference,
        email: request.metadata?.email || 'user@example.com', // Should come from user context
        ...(request.channel && { channels: [request.channel] }),
        ...(request.callbackUrl && { callback_url: request.callbackUrl }),
        metadata: {
          ...request.metadata,
          user_id: request.userId,
          transaction_id: transaction.id
        }
      });

      // Update transaction with Paystack data
      await this.updateTransaction(transaction.id, {
        status: 'processing',
        metadata: {
          ...transaction.metadata,
          paystack_access_code: paystackResponse.access_code,
          paystack_authorization_url: paystackResponse.authorization_url
        }
      });

      logger.info('Payment initiated successfully', {
        userId: request.userId,
        reference,
        amount: request.amount,
        currency: request.currency,
        transactionId: transaction.id
      });

      return {
        transactionId: transaction.id,
        reference,
        authorizationUrl: paystackResponse.authorization_url,
        accessCode: paystackResponse.access_code
      };

    } catch (error) {
      logger.error('Payment initiation failed', {
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Payment initiation failed',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'PAYMENT_INITIATION_ERROR'
      );
    }
  }

  async verifyPayment(reference: string): Promise<Transaction> {
    try {
      // Get transaction from database
      const transaction = await this.getTransactionByReference(reference);

      // Verify with Paystack
      const paystackResponse = await this.verifyPaystackPayment(reference);

      // Update transaction status based on Paystack response
      const updatedTransaction = await this.updateTransaction(transaction.id, {
        status: paystackResponse.status === 'success' ? 'success' : 'failed',
        metadata: {
          ...transaction.metadata,
          paystack_verification: paystackResponse,
          verified_at: new Date().toISOString()
        }
      });

      logger.info('Payment verified', {
        reference,
        status: updatedTransaction.status,
        amount: updatedTransaction.amount,
        currency: updatedTransaction.currency
      });

      return updatedTransaction;

    } catch (error) {
      logger.error('Payment verification failed', {
        reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Payment verification failed',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'PAYMENT_VERIFICATION_ERROR'
      );
    }
  }

  async getTransactionByReference(reference: string): Promise<Transaction> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from(this.tableName)
        .select('*')
        .eq('reference', reference)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(
            'Transaction not found',
            HttpStatusCode.NOT_FOUND,
            'TRANSACTION_NOT_FOUND'
          );
        }
        throw error;
      }

      return this.mapDatabaseTransactionToTransaction(data);

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get transaction by reference failed', {
        reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get transaction',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_TRANSACTION_ERROR'
      );
    }
  }

  async getUserTransactions(userId: string, query: TransactionQuery): Promise<PaginationResult<Transaction>> {
    try {
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);
      const offset = (page - 1) * limit;

      // Build query
      let dbQuery = supabaseService.getClient()
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (query.status) {
        dbQuery = dbQuery.eq('status', query.status);
      }
      if (query.currency) {
        dbQuery = dbQuery.eq('currency', query.currency);
      }
      if (query.provider) {
        dbQuery = dbQuery.eq('provider', query.provider);
      }

      // Apply sorting
      const sortBy = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder || 'desc';
      dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      dbQuery = dbQuery.range(offset, offset + limit - 1);

      const { data, error, count } = await dbQuery;

      if (error) {
        throw error;
      }

      const transactions = (data || []).map(this.mapDatabaseTransactionToTransaction);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items: transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Get user transactions failed', {
        userId,
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get user transactions',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_USER_TRANSACTIONS_ERROR'
      );
    }
  }

  private async createTransaction(data: {
    userId: string;
    amount: number;
    currency: string;
    reference: string;
    description?: string;
    metadata?: Record<string, any>;
    status: string;
    provider: string;
  }): Promise<Transaction> {
    try {
      const transactionId = uuidv4();
      const now = new Date().toISOString();

      const transactionData = {
        id: transactionId,
        user_id: data.userId,
        amount: data.amount,
        currency: data.currency,
        reference: data.reference,
        description: data.description,
        metadata: data.metadata || {},
        status: data.status,
        provider: data.provider,
        created_at: now,
        updated_at: now
      };

      const { data: insertedTransaction, error } = await supabaseService.getClient()
        .from(this.tableName)
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapDatabaseTransactionToTransaction(insertedTransaction);

    } catch (error) {
      logger.error('Create transaction failed', {
        reference: data.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to create transaction',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CREATE_TRANSACTION_ERROR'
      );
    }
  }

  private async updateTransaction(transactionId: string, updates: {
    status?: string;
    metadata?: Record<string, any>;
  }): Promise<Transaction> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.status) {
        updateData.status = updates.status;
      }
      if (updates.metadata) {
        updateData.metadata = updates.metadata;
      }

      const { data, error } = await supabaseService.getClient()
        .from(this.tableName)
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapDatabaseTransactionToTransaction(data);

    } catch (error) {
      logger.error('Update transaction failed', {
        transactionId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to update transaction',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'UPDATE_TRANSACTION_ERROR'
      );
    }
  }

  private async initializePaystackPayment(data: {
    amount: number;
    currency: string;
    reference: string;
    email: string;
    channels?: string[];
    callback_url?: string;
    metadata?: Record<string, any>;
  }): Promise<{ access_code: string; authorization_url: string; reference: string }> {
    try {
      const response = await axios.post(
        `${config.paystack.baseUrl}/transaction/initialize`,
        {
          amount: data.amount,
          currency: data.currency,
          reference: data.reference,
          email: data.email,
          channels: data.channels,
          callback_url: data.callback_url,
          metadata: data.metadata
        },
        {
          headers: {
            'Authorization': `Bearer ${config.paystack.secretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data.status) {
        throw new Error(`Paystack initialization failed: ${response.data.message}`);
      }

      return response.data.data;

    } catch (error) {
      logger.error('Paystack initialization failed', {
        reference: data.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Payment provider initialization failed',
        HttpStatusCode.BAD_GATEWAY,
        'PAYSTACK_INITIALIZATION_ERROR'
      );
    }
  }

  private async verifyPaystackPayment(reference: string): Promise<any> {
    try {
      const response = await axios.get(
        `${config.paystack.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${config.paystack.secretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data.status) {
        throw new Error(`Paystack verification failed: ${response.data.message}`);
      }

      return response.data.data;

    } catch (error) {
      logger.error('Paystack verification failed', {
        reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Payment provider verification failed',
        HttpStatusCode.BAD_GATEWAY,
        'PAYSTACK_VERIFICATION_ERROR'
      );
    }
  }

  private mapDatabaseTransactionToTransaction(dbTransaction: any): Transaction {
    return {
      id: dbTransaction.id,
      userId: dbTransaction.user_id,
      amount: dbTransaction.amount,
      currency: dbTransaction.currency,
      status: dbTransaction.status,
      provider: dbTransaction.provider,
      reference: dbTransaction.reference,
      description: dbTransaction.description,
      metadata: dbTransaction.metadata || {},
      createdAt: dbTransaction.created_at,
      updatedAt: dbTransaction.updated_at
    };
  }
}
