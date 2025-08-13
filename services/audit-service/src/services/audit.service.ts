import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { 
  supabaseService, 
  logger, 
  AppError, 
  HttpStatusCode,
  AuditLog,
  PaginationQuery,
  PaginationResult
} from '@CalvaryPay/shared';
import { config } from '../config';

export interface AuditLogQuery extends PaginationQuery {
  type?: string;
  actorUserId?: string;
  correlationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditStatistics {
  totalLogs: number;
  logsByType: Record<string, number>;
  logsByDay: Array<{
    date: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: string;
    count: number;
  }>;
  recentActivity: AuditLog[];
}

export class AuditService {
  private readonly tableName = 'audit_logs';

  async createAuditLog(data: {
    type: string;
    correlationId: string;
    actorUserId?: string;
    actorType?: string;
    resourceId?: string;
    resourceType?: string;
    action: string;
    outcome: 'success' | 'failure';
    payload?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    try {
      const auditLogId = uuidv4();
      const now = new Date().toISOString();

      // Generate HMAC signature for integrity
      const signaturePayload = JSON.stringify({
        id: auditLogId,
        type: data.type,
        correlationId: data.correlationId,
        actorUserId: data.actorUserId,
        action: data.action,
        outcome: data.outcome,
        eventTime: now
      });

      const signature = crypto
        .createHmac(config.hmac.algorithm, config.hmac.secret)
        .update(signaturePayload)
        .digest('hex');

      const auditLogData = {
        id: auditLogId,
        event_time: now,
        type: data.type,
        correlation_id: data.correlationId,
        actor_user_id: data.actorUserId,
        actor_type: data.actorType || 'user',
        resource_id: data.resourceId,
        resource_type: data.resourceType,
        action: data.action,
        outcome: data.outcome,
        payload: data.payload || {},
        metadata: data.metadata || {},
        signature_hmac: signature
      };

      const { data: insertedLog, error } = await supabaseService.getClient()
        .from(this.tableName)
        .insert(auditLogData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const auditLog = this.mapDatabaseAuditLogToAuditLog(insertedLog);

      logger.debug('Audit log created', {
        id: auditLog.id,
        type: auditLog.type,
        correlationId: auditLog.correlationId,
        action: auditLog.action
      });

      return auditLog;

    } catch (error) {
      logger.error('Create audit log failed', {
        type: data.type,
        correlationId: data.correlationId,
        action: data.action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to create audit log',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CREATE_AUDIT_LOG_ERROR'
      );
    }
  }

  async getAuditLogs(query: AuditLogQuery): Promise<PaginationResult<AuditLog>> {
    try {
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);
      const offset = (page - 1) * limit;

      // Build query
      let dbQuery = supabaseService.getClient()
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Apply filters
      if (query.type) {
        dbQuery = dbQuery.eq('type', query.type);
      }
      if (query.actorUserId) {
        dbQuery = dbQuery.eq('actor_user_id', query.actorUserId);
      }
      if (query.correlationId) {
        dbQuery = dbQuery.eq('correlation_id', query.correlationId);
      }
      if (query.startDate) {
        dbQuery = dbQuery.gte('event_time', query.startDate);
      }
      if (query.endDate) {
        dbQuery = dbQuery.lte('event_time', query.endDate);
      }

      // Apply sorting
      const sortBy = query.sortBy || 'event_time';
      const sortOrder = query.sortOrder || 'desc';
      dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      dbQuery = dbQuery.range(offset, offset + limit - 1);

      const { data, error, count } = await dbQuery;

      if (error) {
        throw error;
      }

      const auditLogs = (data || []).map(this.mapDatabaseAuditLogToAuditLog);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items: auditLogs,
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
      logger.error('Get audit logs failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get audit logs',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_AUDIT_LOGS_ERROR'
      );
    }
  }

  async getAuditLogById(id: string): Promise<AuditLog> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(
            'Audit log not found',
            HttpStatusCode.NOT_FOUND,
            'AUDIT_LOG_NOT_FOUND'
          );
        }
        throw error;
      }

      return this.mapDatabaseAuditLogToAuditLog(data);

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get audit log by ID failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get audit log',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_AUDIT_LOG_ERROR'
      );
    }
  }

  async getAuditStatistics(): Promise<AuditStatistics> {
    try {
      // Get total logs count
      const { count: totalLogs } = await supabaseService.getClient()
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Get logs by type
      const { data: typeData } = await supabaseService.getClient()
        .from(this.tableName)
        .select('type')
        .order('type');

      const logsByType: Record<string, number> = {};
      (typeData || []).forEach((row: any) => {
        logsByType[row.type] = (logsByType[row.type] || 0) + 1;
      });

      // Get logs by day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: dailyData } = await supabaseService.getClient()
        .from(this.tableName)
        .select('event_time')
        .gte('event_time', thirtyDaysAgo.toISOString())
        .order('event_time');

      const logsByDay: Array<{ date: string; count: number }> = [];
      const dailyCounts: Record<string, number> = {};

      (dailyData || []).forEach((row: any) => {
        const date = new Date(row.event_time).toISOString().split('T')[0];
        if (date) {
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        }
      });

      Object.entries(dailyCounts).forEach(([date, count]) => {
        logsByDay.push({ date, count });
      });

      // Get top users (last 30 days)
      const { data: userData } = await supabaseService.getClient()
        .from(this.tableName)
        .select('actor_user_id')
        .gte('event_time', thirtyDaysAgo.toISOString())
        .not('actor_user_id', 'is', null);

      const userCounts: Record<string, number> = {};
      (userData || []).forEach((row: any) => {
        userCounts[row.actor_user_id] = (userCounts[row.actor_user_id] || 0) + 1;
      });

      const topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get recent activity (last 10 logs)
      const { data: recentData } = await supabaseService.getClient()
        .from(this.tableName)
        .select('*')
        .order('event_time', { ascending: false })
        .limit(10);

      const recentActivity = (recentData || []).map(this.mapDatabaseAuditLogToAuditLog);

      return {
        totalLogs: totalLogs || 0,
        logsByType,
        logsByDay: logsByDay.sort((a, b) => a.date.localeCompare(b.date)),
        topUsers,
        recentActivity
      };

    } catch (error) {
      logger.error('Get audit statistics failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get audit statistics',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_AUDIT_STATS_ERROR'
      );
    }
  }

  async verifyAuditLogIntegrity(auditLog: AuditLog): Promise<boolean> {
    try {
      // Recreate signature payload
      const signaturePayload = JSON.stringify({
        id: auditLog.id,
        type: auditLog.type,
        correlationId: auditLog.correlationId,
        actorUserId: auditLog.actorUserId,
        action: auditLog.action,
        outcome: auditLog.outcome,
        eventTime: auditLog.eventTime
      });

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac(config.hmac.algorithm, config.hmac.secret)
        .update(signaturePayload)
        .digest('hex');

      return auditLog.signatureHmac === expectedSignature;

    } catch (error) {
      logger.error('Verify audit log integrity failed', {
        auditLogId: auditLog.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private mapDatabaseAuditLogToAuditLog(dbAuditLog: any): AuditLog {
    return {
      id: dbAuditLog.id,
      eventTime: dbAuditLog.event_time,
      type: dbAuditLog.type,
      correlationId: dbAuditLog.correlation_id,
      actorUserId: dbAuditLog.actor_user_id,
      actorType: dbAuditLog.actor_type,
      resourceId: dbAuditLog.resource_id,
      resourceType: dbAuditLog.resource_type,
      action: dbAuditLog.action,
      outcome: dbAuditLog.outcome,
      payload: dbAuditLog.payload || {},
      metadata: dbAuditLog.metadata || {},
      signatureHmac: dbAuditLog.signature_hmac
    };
  }
}
