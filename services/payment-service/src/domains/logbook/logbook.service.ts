import { v4 as uuidv4 } from 'uuid';
import { 
  supabaseService, 
  logger, 
  AppError, 
  HttpStatusCode,
  PaginationResult
} from '@eliteepay/shared';
import { 
  LogbookEntry, 
  CreateLogbookEntryRequest, 
  LogbookEntryQuery,
  OfflineSyncRequest,
  OfflineSyncResponse,
  SyncResult,
  DatabaseLogbookEntry
} from './logbook.types';

export class LogbookService {
  private readonly tableName = 'logbook_entries';

  async createEntry(userId: string, request: CreateLogbookEntryRequest): Promise<LogbookEntry> {
    try {
      // Validate request
      this.validateCreateRequest(request);

      const entryId = uuidv4();
      const now = new Date().toISOString();

      // Handle photo upload if provided
      let photoUrl: string | undefined;
      if (request.photo) {
        photoUrl = await this.uploadPhoto(request.photo, userId, entryId);
      }

      // Create database entry
      const entryData: Omit<DatabaseLogbookEntry, 'created_at' | 'updated_at'> = {
        id: entryId,
        user_id: userId,
        type: request.type,
        amount_minor: Math.round(request.amount * 100), // Convert to minor units
        currency: request.currency,
        note: request.note,
        photo_url: photoUrl,
        location: request.location,
        is_reconciled: false,
        reconciled_transaction_id: undefined,
        client_id: request.clientId
      };

      const { data, error } = await supabaseService.getClient()
        .from(this.tableName)
        .insert({
          ...entryData,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) {
        // Clean up uploaded photo if database insert fails
        if (photoUrl) {
          await this.deletePhoto(photoUrl).catch(() => {}); // Don't fail if cleanup fails
        }
        throw error;
      }

      const logbookEntry = this.mapDatabaseEntryToLogbookEntry(data);

      logger.info('Logbook entry created successfully', {
        entryId,
        userId,
        type: request.type,
        amount: request.amount,
        currency: request.currency,
        hasPhoto: !!photoUrl,
        hasLocation: !!request.location
      });

      return logbookEntry;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Create logbook entry failed', {
        userId,
        type: request.type,
        amount: request.amount,
        currency: request.currency,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to create logbook entry',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CREATE_LOGBOOK_ENTRY_ERROR'
      );
    }
  }

  async getUserEntries(userId: string, query: LogbookEntryQuery): Promise<PaginationResult<LogbookEntry>> {
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
      if (query.type) {
        dbQuery = dbQuery.eq('type', query.type);
      }
      if (query.currency) {
        dbQuery = dbQuery.eq('currency', query.currency);
      }
      if (query.isReconciled !== undefined) {
        dbQuery = dbQuery.eq('is_reconciled', query.isReconciled);
      }
      if (query.startDate) {
        dbQuery = dbQuery.gte('created_at', query.startDate);
      }
      if (query.endDate) {
        dbQuery = dbQuery.lte('created_at', query.endDate);
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

      const entries = (data || []).map(this.mapDatabaseEntryToLogbookEntry);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items: entries,
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
      logger.error('Get user logbook entries failed', {
        userId,
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get logbook entries',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_LOGBOOK_ENTRIES_ERROR'
      );
    }
  }

  async getEntryById(entryId: string, userId: string): Promise<LogbookEntry> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from(this.tableName)
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(
            'Logbook entry not found',
            HttpStatusCode.NOT_FOUND,
            'LOGBOOK_ENTRY_NOT_FOUND'
          );
        }
        throw error;
      }

      return this.mapDatabaseEntryToLogbookEntry(data);

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get logbook entry by ID failed', {
        entryId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get logbook entry',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_LOGBOOK_ENTRY_ERROR'
      );
    }
  }

  async syncOfflineEntries(userId: string, request: OfflineSyncRequest): Promise<OfflineSyncResponse> {
    try {
      const syncResults: SyncResult[] = [];
      const correlationId = uuidv4();

      logger.info('Starting offline sync', {
        userId,
        entryCount: request.entries.length,
        correlationId
      });

      for (const entry of request.entries) {
        try {
          // Check if entry already exists by client ID
          if (entry.clientId) {
            const existingEntry = await this.findEntryByClientId(entry.clientId, userId);
            if (existingEntry) {
              syncResults.push({
                clientId: entry.clientId,
                status: 'duplicate',
                serverId: existingEntry.id
              });
              continue;
            }
          }

          // Create the entry
          const createdEntry = await this.createEntry(userId, entry);
          syncResults.push({
            clientId: entry.clientId,
            status: 'synced',
            serverId: createdEntry.id
          });

        } catch (error) {
          syncResults.push({
            clientId: entry.clientId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const syncedCount = syncResults.filter(r => r.status === 'synced').length;
      const failedCount = syncResults.filter(r => r.status === 'failed').length;
      const duplicateCount = syncResults.filter(r => r.status === 'duplicate').length;

      logger.info('Offline sync completed', {
        userId,
        totalEntries: request.entries.length,
        syncedCount,
        failedCount,
        duplicateCount,
        correlationId
      });

      return {
        syncResults,
        totalProcessed: request.entries.length,
        correlationId
      };

    } catch (error) {
      logger.error('Offline sync failed', {
        userId,
        entryCount: request.entries.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to sync offline entries',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'OFFLINE_SYNC_ERROR'
      );
    }
  }

  private async findEntryByClientId(clientId: string, userId: string): Promise<LogbookEntry | null> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from(this.tableName)
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Entry not found
        }
        throw error;
      }

      return this.mapDatabaseEntryToLogbookEntry(data);

    } catch (error) {
      logger.error('Find entry by client ID failed', {
        clientId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private validateCreateRequest(request: CreateLogbookEntryRequest): void {
    if (!['fuel', 'cash', 'misc'].includes(request.type)) {
      throw new AppError(
        'Invalid logbook entry type',
        HttpStatusCode.BAD_REQUEST,
        'INVALID_ENTRY_TYPE'
      );
    }

    if (request.amount <= 0 || request.amount > 1000000) { // Max 1M in major units
      throw new AppError(
        'Invalid amount',
        HttpStatusCode.BAD_REQUEST,
        'INVALID_AMOUNT'
      );
    }

    if (!['NGN', 'KES', 'GHS', 'ZAR', 'USD'].includes(request.currency)) {
      throw new AppError(
        'Invalid currency',
        HttpStatusCode.BAD_REQUEST,
        'INVALID_CURRENCY'
      );
    }

    if (request.note && request.note.length > 500) {
      throw new AppError(
        'Note too long',
        HttpStatusCode.BAD_REQUEST,
        'NOTE_TOO_LONG'
      );
    }

    if (request.location) {
      if (typeof request.location.lat !== 'number' || 
          typeof request.location.lng !== 'number' ||
          request.location.lat < -90 || request.location.lat > 90 ||
          request.location.lng < -180 || request.location.lng > 180) {
        throw new AppError(
          'Invalid location coordinates',
          HttpStatusCode.BAD_REQUEST,
          'INVALID_LOCATION'
        );
      }
    }
  }

  private async uploadPhoto(photo: Express.Multer.File, userId: string, entryId: string): Promise<string> {
    // TODO: Implement photo upload to Supabase Storage
    // For now, return a placeholder URL
    return `https://storage.supabase.co/logbook-photos/${userId}/${entryId}.jpg`;
  }

  private async deletePhoto(photoUrl: string): Promise<void> {
    // TODO: Implement photo deletion from Supabase Storage
    logger.debug('Photo deletion requested', { photoUrl });
  }

  private mapDatabaseEntryToLogbookEntry(dbEntry: DatabaseLogbookEntry): LogbookEntry {
    return {
      id: dbEntry.id,
      userId: dbEntry.user_id,
      type: dbEntry.type,
      amountMinor: dbEntry.amount_minor,
      currency: dbEntry.currency,
      note: dbEntry.note || undefined,
      photoUrl: dbEntry.photo_url || undefined,
      location: dbEntry.location || undefined,
      isReconciled: dbEntry.is_reconciled,
      reconciledTransactionId: dbEntry.reconciled_transaction_id || undefined,
      clientId: dbEntry.client_id || undefined,
      createdAt: dbEntry.created_at,
      updatedAt: dbEntry.updated_at
    };
  }
}
