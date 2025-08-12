import { v4 as uuidv4 } from 'uuid';
import { redisService, logger, AppError, HttpStatusCode } from '@eliteepay/shared';

export interface IdempotencyRecord {
  key: string;
  transactionId: string;
  userId: string;
  requestHash: string;
  response: any;
  createdAt: string;
  expiresAt: string;
}

export class IdempotencyService {
  private readonly keyPrefix = 'idempotency:';
  private readonly ttlSeconds = 15 * 60; // 15 minutes

  /**
   * Check if a request with the given idempotency key already exists
   * @param idempotencyKey - The idempotency key from the request header
   * @param userId - The user making the request
   * @param requestHash - Hash of the request body for validation
   * @returns Existing transaction ID if found, null if new request
   */
  async checkIdempotency(
    idempotencyKey: string,
    userId: string,
    requestHash: string
  ): Promise<{ transactionId: string; response: any } | null> {
    try {
      const redisKey = this.buildRedisKey(idempotencyKey, userId);
      const existingRecord = await redisService.get(redisKey);

      if (!existingRecord) {
        return null; // New request
      }

      const record: IdempotencyRecord = JSON.parse(existingRecord);

      // Validate that the request body matches the original
      if (record.requestHash !== requestHash) {
        throw new AppError(
          'Idempotency key reused with different request body',
          HttpStatusCode.CONFLICT,
          'IDEMPOTENCY_CONFLICT'
        );
      }

      logger.info('Idempotent request detected', {
        idempotencyKey,
        userId,
        originalTransactionId: record.transactionId,
        createdAt: record.createdAt
      });

      return {
        transactionId: record.transactionId,
        response: record.response
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Idempotency check failed', {
        idempotencyKey,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // If Redis is down, allow the request to proceed (fail open)
      return null;
    }
  }

  /**
   * Store an idempotency record for a successful transaction
   * @param idempotencyKey - The idempotency key from the request header
   * @param userId - The user making the request
   * @param transactionId - The created transaction ID
   * @param requestHash - Hash of the request body
   * @param response - The response to cache
   */
  async storeIdempotencyRecord(
    idempotencyKey: string,
    userId: string,
    transactionId: string,
    requestHash: string,
    response: any
  ): Promise<void> {
    try {
      const redisKey = this.buildRedisKey(idempotencyKey, userId);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

      const record: IdempotencyRecord = {
        key: idempotencyKey,
        transactionId,
        userId,
        requestHash,
        response,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      await redisService.set(redisKey, JSON.stringify(record), this.ttlSeconds);

      logger.info('Idempotency record stored', {
        idempotencyKey,
        userId,
        transactionId,
        ttlSeconds: this.ttlSeconds
      });

    } catch (error) {
      // Log error but don't fail the transaction if Redis is down
      logger.error('Failed to store idempotency record', {
        idempotencyKey,
        userId,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Remove an idempotency record (used for failed transactions)
   * @param idempotencyKey - The idempotency key from the request header
   * @param userId - The user making the request
   */
  async removeIdempotencyRecord(idempotencyKey: string, userId: string): Promise<void> {
    try {
      const redisKey = this.buildRedisKey(idempotencyKey, userId);
      await redisService.del(redisKey);

      logger.info('Idempotency record removed', {
        idempotencyKey,
        userId
      });

    } catch (error) {
      logger.error('Failed to remove idempotency record', {
        idempotencyKey,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate a hash of the request body for idempotency validation
   * @param requestBody - The request body object
   * @returns SHA-256 hash of the request body
   */
  generateRequestHash(requestBody: any): string {
    const crypto = require('crypto');
    const normalizedBody = JSON.stringify(requestBody, Object.keys(requestBody).sort());
    return crypto.createHash('sha256').update(normalizedBody).digest('hex');
  }

  /**
   * Validate idempotency key format
   * @param key - The idempotency key to validate
   * @returns true if valid, false otherwise
   */
  validateIdempotencyKey(key: string): boolean {
    // Must be 1-255 characters, alphanumeric with hyphens and underscores
    const keyRegex = /^[a-zA-Z0-9_-]{1,255}$/;
    return keyRegex.test(key);
  }

  /**
   * Generate a unique idempotency key (for testing or client use)
   * @param prefix - Optional prefix for the key
   * @returns A unique idempotency key
   */
  generateIdempotencyKey(prefix: string = 'txn'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  private buildRedisKey(idempotencyKey: string, userId: string): string {
    return `${this.keyPrefix}${userId}:${idempotencyKey}`;
  }

  /**
   * Get statistics about idempotency usage
   * @param userId - Optional user ID to filter by
   * @returns Statistics about idempotency key usage
   */
  async getIdempotencyStats(userId?: string): Promise<{
    totalKeys: number;
    userKeys?: number;
    oldestKey?: string;
    newestKey?: string;
  }> {
    try {
      // TODO: Implement when Redis KEYS command is available
      // For now, return basic stats
      logger.info('Idempotency stats requested', {
        userId: userId || 'all'
      });

      return {
        totalKeys: 0,
        ...(userId && { userKeys: 0 })
      };

    } catch (error) {
      logger.error('Failed to get idempotency stats', {
        userId: userId || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { totalKeys: 0 };
    }
  }
}
