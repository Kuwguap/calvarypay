import { v4 as uuidv4 } from 'uuid';
import { 
  supabaseService, 
  logger, 
  AppError, 
  HttpStatusCode,
  PaginationResult,
  redisService
} from '@CalvaryPay/shared';
import { 
  PriceConfig,
  CreatePriceRequest,
  UpdatePriceRequest,
  PriceQuery,
  PriceHistory,
  DatabasePrice,
  DatabasePriceHistory,
  PricingUpdatedEvent,
  PricingServiceStats
} from '../types/pricing.types';
import { config } from '../config';

export class PricingService {
  private readonly pricesTable = 'prices';
  private readonly priceHistoryTable = 'price_history';
  private readonly cacheKeyPrefix = 'price:';

  async createPrice(request: CreatePriceRequest, createdBy: string): Promise<PriceConfig> {
    try {
      // Validate price key uniqueness
      const existingPrice = await this.getPriceByKey(request.key);
      if (existingPrice) {
        throw new AppError(
          'Price key already exists',
          HttpStatusCode.CONFLICT,
          'PRICE_KEY_EXISTS'
        );
      }

      const priceId = uuidv4();
      const now = new Date().toISOString();
      const amountMinor = Math.round(request.amount * 100); // Convert to minor units

      // Create database entry
      const priceData: Omit<DatabasePrice, 'created_at' | 'updated_at'> = {
        id: priceId,
        key: request.key,
        name: request.name,
        description: request.description,
        currency: request.currency,
        amount_minor: amountMinor,
        is_active: request.isActive ?? true,
        valid_from: request.validFrom,
        valid_to: request.validTo,
        metadata: request.metadata,
        created_by: createdBy
      };

      const { data, error } = await supabaseService.getClient()
        .from(this.pricesTable)
        .insert({
          ...priceData,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const price = this.mapDatabasePriceToPrice(data);

      // Create initial price history entry
      await this.createPriceHistoryEntry({
        priceId,
        key: request.key,
        amountMinor,
        currency: request.currency,
        changedBy: createdBy,
        changeReason: 'Initial price creation'
      });

      // Invalidate cache
      await this.invalidatePriceCache(request.key);

      // Publish pricing updated event
      await this.publishPricingUpdatedEvent({
        priceKey: request.key,
        newAmountMinor: amountMinor,
        currency: request.currency,
        updatedBy: createdBy,
        updatedAt: now
      });

      logger.info('Price created successfully', {
        priceId,
        key: request.key,
        amount: request.amount,
        currency: request.currency,
        createdBy
      });

      return price;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Create price failed', {
        key: request.key,
        amount: request.amount,
        currency: request.currency,
        createdBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to create price',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CREATE_PRICE_ERROR'
      );
    }
  }

  async updatePrice(
    priceKey: string, 
    request: UpdatePriceRequest, 
    updatedBy: string
  ): Promise<PriceConfig> {
    try {
      // Get existing price
      const existingPrice = await this.getPriceByKey(priceKey);
      if (!existingPrice) {
        throw new AppError(
          'Price not found',
          HttpStatusCode.NOT_FOUND,
          'PRICE_NOT_FOUND'
        );
      }

      const now = new Date().toISOString();
      const updateData: Partial<DatabasePrice> = {
        updated_at: now
      };

      // Build update data
      if (request.name !== undefined) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.isActive !== undefined) updateData.is_active = request.isActive;
      if (request.validFrom !== undefined) updateData.valid_from = request.validFrom;
      if (request.validTo !== undefined) updateData.valid_to = request.validTo;
      if (request.metadata !== undefined) updateData.metadata = request.metadata;

      let newAmountMinor = existingPrice.amountMinor;
      if (request.amount !== undefined) {
        newAmountMinor = Math.round(request.amount * 100);
        updateData.amount_minor = newAmountMinor;
      }

      const { data, error } = await supabaseService.getClient()
        .from(this.pricesTable)
        .update(updateData)
        .eq('key', priceKey)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedPrice = this.mapDatabasePriceToPrice(data);

      // Create price history entry if amount changed
      if (request.amount !== undefined && newAmountMinor !== existingPrice.amountMinor) {
        await this.createPriceHistoryEntry({
          priceId: existingPrice.id,
          key: priceKey,
          amountMinor: newAmountMinor,
          currency: existingPrice.currency,
          changedBy: updatedBy,
          changeReason: 'Price update',
          previousAmountMinor: existingPrice.amountMinor
        });

        // Publish pricing updated event
        await this.publishPricingUpdatedEvent({
          priceKey,
          oldAmountMinor: existingPrice.amountMinor,
          newAmountMinor,
          currency: existingPrice.currency,
          updatedBy,
          updatedAt: now
        });
      }

      // Invalidate cache
      await this.invalidatePriceCache(priceKey);

      logger.info('Price updated successfully', {
        priceKey,
        updatedBy,
        amountChanged: request.amount !== undefined,
        oldAmount: existingPrice.amountMinor / 100,
        newAmount: newAmountMinor / 100
      });

      return updatedPrice;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Update price failed', {
        priceKey,
        updatedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to update price',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'UPDATE_PRICE_ERROR'
      );
    }
  }

  async getPriceByKey(key: string): Promise<PriceConfig | null> {
    try {
      // Try cache first
      const cacheKey = `${this.cacheKeyPrefix}${key}`;
      const cachedPrice = await redisService.get(cacheKey);
      
      if (cachedPrice) {
        logger.debug('Price retrieved from cache', { key });
        return JSON.parse(cachedPrice);
      }

      // Fetch from database
      const { data, error } = await supabaseService.getClient()
        .from(this.pricesTable)
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Price not found
        }
        throw error;
      }

      const price = this.mapDatabasePriceToPrice(data);

      // Cache the result
      await redisService.set(cacheKey, JSON.stringify(price), config.priceCacheTtlSeconds);

      return price;

    } catch (error) {
      logger.error('Get price by key failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async getPrices(query: PriceQuery): Promise<PaginationResult<PriceConfig>> {
    try {
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);
      const offset = (page - 1) * limit;

      // Build query
      let dbQuery = supabaseService.getClient()
        .from(this.pricesTable)
        .select('*', { count: 'exact' });

      // Apply filters
      if (query.currency) {
        dbQuery = dbQuery.eq('currency', query.currency);
      }
      if (query.isActive !== undefined) {
        dbQuery = dbQuery.eq('is_active', query.isActive);
      }
      if (query.key) {
        dbQuery = dbQuery.ilike('key', `%${query.key}%`);
      }
      if (query.validAt) {
        dbQuery = dbQuery
          .or(`valid_from.is.null,valid_from.lte.${query.validAt}`)
          .or(`valid_to.is.null,valid_to.gte.${query.validAt}`);
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

      const prices = (data || []).map(this.mapDatabasePriceToPrice);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items: prices,
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
      logger.error('Get prices failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get prices',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_PRICES_ERROR'
      );
    }
  }

  private async createPriceHistoryEntry(entry: {
    priceId: string;
    key: string;
    amountMinor: number;
    currency: string;
    changedBy: string;
    changeReason?: string;
    previousAmountMinor?: number;
  }): Promise<void> {
    try {
      const historyData: Omit<DatabasePriceHistory, 'id' | 'changed_at'> = {
        price_id: entry.priceId,
        key: entry.key,
        amount_minor: entry.amountMinor,
        currency: entry.currency as any,
        changed_by: entry.changedBy,
        change_reason: entry.changeReason,
        previous_amount_minor: entry.previousAmountMinor
      };

      await supabaseService.getClient()
        .from(this.priceHistoryTable)
        .insert({
          ...historyData,
          id: uuidv4(),
          changed_at: new Date().toISOString()
        });

    } catch (error) {
      logger.error('Failed to create price history entry', {
        priceId: entry.priceId,
        key: entry.key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async invalidatePriceCache(key: string): Promise<void> {
    try {
      const cacheKey = `${this.cacheKeyPrefix}${key}`;
      await redisService.del(cacheKey);
    } catch (error) {
      logger.error('Failed to invalidate price cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async publishPricingUpdatedEvent(eventData: {
    priceKey: string;
    oldAmountMinor?: number;
    newAmountMinor: number;
    currency: string;
    updatedBy: string;
    updatedAt: string;
  }): Promise<void> {
    try {
      const event: PricingUpdatedEvent = {
        type: 'pricing.updated',
        data: eventData as any,
        correlationId: uuidv4(),
        timestamp: new Date().toISOString()
      };

      // TODO: Implement Redis pub/sub when available
      logger.info('Pricing updated event', {
        event: event.type,
        priceKey: eventData.priceKey,
        correlationId: event.correlationId
      });

    } catch (error) {
      logger.error('Failed to publish pricing updated event', {
        priceKey: eventData.priceKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getServiceStats(): Promise<PricingServiceStats> {
    try {
      const { data: allPrices, error: allError } = await supabaseService.getClient()
        .from(this.pricesTable)
        .select('currency, is_active, updated_at')
        .order('updated_at', { ascending: false });

      if (allError) throw allError;

      const totalPrices = allPrices?.length || 0;
      const activePrices = allPrices?.filter(p => p.is_active).length || 0;
      const currenciesSupported = new Set(allPrices?.map(p => p.currency)).size;
      const lastPriceUpdate = allPrices?.[0]?.updated_at || new Date().toISOString();

      return {
        totalPrices,
        activePrices,
        currenciesSupported,
        lastPriceUpdate,
        lastRateUpdate: new Date().toISOString() // TODO: Get from currency rates table
      };

    } catch (error) {
      logger.error('Get service stats failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        totalPrices: 0,
        activePrices: 0,
        currenciesSupported: 0,
        lastPriceUpdate: new Date().toISOString(),
        lastRateUpdate: new Date().toISOString()
      };
    }
  }

  private mapDatabasePriceToPrice(dbPrice: DatabasePrice): PriceConfig {
    return {
      id: dbPrice.id,
      key: dbPrice.key,
      name: dbPrice.name,
      description: dbPrice.description,
      currency: dbPrice.currency,
      amountMinor: dbPrice.amount_minor,
      isActive: dbPrice.is_active,
      validFrom: dbPrice.valid_from,
      validTo: dbPrice.valid_to,
      metadata: dbPrice.metadata,
      createdAt: dbPrice.created_at,
      updatedAt: dbPrice.updated_at,
      createdBy: dbPrice.created_by
    };
  }
}
