import { 
  supabaseService, 
  logger, 
  AppError, 
  HttpStatusCode,
  Transaction
} from '@eliteepay/shared';
import { PaymentService } from './payment.service';

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    log: {
      start_time: number;
      time_spent: number;
      attempts: number;
      errors: number;
      success: boolean;
      mobile: boolean;
      input: any[];
      history: any[];
    };
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: Record<string, any>;
      risk_action: string;
      international_format_phone: string;
    };
    plan: any;
    split: any;
    order_id: any;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

export class WebhookService {
  private readonly paymentService = new PaymentService();
  private readonly auditTableName = 'audit_logs';

  async processPaystackWebhook(payload: PaystackWebhookPayload): Promise<void> {
    try {
      logger.info('Processing Paystack webhook', {
        event: payload.event,
        reference: payload.data.reference,
        status: payload.data.status
      });

      // Log webhook event for audit
      await this.logWebhookEvent(payload);

      // Process based on event type
      switch (payload.event) {
        case 'charge.success':
          await this.handleChargeSuccess(payload);
          break;
        
        case 'charge.failed':
          await this.handleChargeFailed(payload);
          break;
        
        case 'transfer.success':
          await this.handleTransferSuccess(payload);
          break;
        
        case 'transfer.failed':
          await this.handleTransferFailed(payload);
          break;
        
        default:
          logger.info('Unhandled webhook event', {
            event: payload.event,
            reference: payload.data.reference
          });
      }

    } catch (error) {
      logger.error('Webhook processing failed', {
        event: payload.event,
        reference: payload.data.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't throw error to prevent webhook retries
      // The webhook endpoint should always return 200
    }
  }

  private async handleChargeSuccess(payload: PaystackWebhookPayload): Promise<void> {
    try {
      const { reference, amount, currency, status } = payload.data;

      // Get transaction
      const transaction = await this.paymentService.getTransactionByReference(reference);

      // Update transaction status
      await this.updateTransactionFromWebhook(transaction.id, {
        status: 'success',
        metadata: {
          ...transaction.metadata,
          paystack_webhook_data: payload.data,
          webhook_processed_at: new Date().toISOString()
        }
      });

      logger.info('Charge success processed', {
        reference,
        transactionId: transaction.id,
        amount,
        currency
      });

    } catch (error) {
      logger.error('Handle charge success failed', {
        reference: payload.data.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleChargeFailed(payload: PaystackWebhookPayload): Promise<void> {
    try {
      const { reference, message, gateway_response } = payload.data;

      // Get transaction
      const transaction = await this.paymentService.getTransactionByReference(reference);

      // Update transaction status
      await this.updateTransactionFromWebhook(transaction.id, {
        status: 'failed',
        metadata: {
          ...transaction.metadata,
          paystack_webhook_data: payload.data,
          failure_reason: message || gateway_response,
          webhook_processed_at: new Date().toISOString()
        }
      });

      logger.info('Charge failed processed', {
        reference,
        transactionId: transaction.id,
        reason: message || gateway_response
      });

    } catch (error) {
      logger.error('Handle charge failed failed', {
        reference: payload.data.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleTransferSuccess(payload: PaystackWebhookPayload): Promise<void> {
    // Handle transfer success events
    logger.info('Transfer success event received', {
      reference: payload.data.reference
    });
  }

  private async handleTransferFailed(payload: PaystackWebhookPayload): Promise<void> {
    // Handle transfer failed events
    logger.info('Transfer failed event received', {
      reference: payload.data.reference
    });
  }

  private async updateTransactionFromWebhook(transactionId: string, updates: {
    status?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
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

      const { error } = await supabaseService.getClient()
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (error) {
        throw error;
      }

    } catch (error) {
      logger.error('Update transaction from webhook failed', {
        transactionId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async logWebhookEvent(payload: PaystackWebhookPayload): Promise<void> {
    try {
      const auditData = {
        id: `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        event_time: new Date().toISOString(),
        type: `webhook.${payload.event}`,
        correlation_id: `webhook_${payload.data.reference}`,
        payload: {
          event: payload.event,
          reference: payload.data.reference,
          status: payload.data.status,
          amount: payload.data.amount,
          currency: payload.data.currency
        },
        signature_hmac: 'webhook_verified' // Signature already verified by middleware
      };

      const { error } = await supabaseService.getClient()
        .from(this.auditTableName)
        .insert(auditData);

      if (error) {
        logger.error('Failed to log webhook event', {
          event: payload.event,
          reference: payload.data.reference,
          error: error.message
        });
      }

    } catch (error) {
      logger.error('Webhook audit logging failed', {
        event: payload.event,
        reference: payload.data.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
