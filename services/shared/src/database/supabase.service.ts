import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logging/logger';
import { AppError } from '../types';

export interface DatabaseConfig {
  url: string;
  serviceRoleKey: string;
  anonKey: string;
}

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient | null = null;
  private serviceClient: SupabaseClient | null = null;
  private config: DatabaseConfig;

  private constructor(config: DatabaseConfig) {
    this.config = config;
  }

  public static getInstance(config?: DatabaseConfig): SupabaseService {
    if (!SupabaseService.instance) {
      if (!config) {
        throw new AppError('Database configuration required for first initialization', 500, 'CONFIG_ERROR');
      }
      SupabaseService.instance = new SupabaseService(config);
    }
    return SupabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      // Create client for user operations (with RLS)
      this.client = createClient(this.config.url, this.config.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      // Create service client for admin operations (bypasses RLS)
      this.serviceClient = createClient(this.config.url, this.config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Test connection
      const { data, error } = await this.serviceClient
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Database connection test failed: ${error.message}`);
      }

      logger.info('Connected to Supabase successfully', {
        url: this.config.url,
        hasClient: !!this.client,
        hasServiceClient: !!this.serviceClient
      });

    } catch (error) {
      logger.error('Failed to connect to Supabase', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: this.config.url
      });
      throw new AppError('Database connection failed', 500, 'DATABASE_CONNECTION_ERROR');
    }
  }

  public getClient(): SupabaseClient {
    if (!this.client) {
      throw new AppError('Database client not initialized', 500, 'DATABASE_NOT_INITIALIZED');
    }
    return this.client;
  }

  public getServiceClient(): SupabaseClient {
    if (!this.serviceClient) {
      throw new AppError('Database service client not initialized', 500, 'DATABASE_NOT_INITIALIZED');
    }
    return this.serviceClient;
  }

  public async disconnect(): Promise<void> {
    // Supabase clients don't need explicit disconnection
    // but we can clean up references
    this.client = null;
    this.serviceClient = null;
    logger.info('Disconnected from Supabase');
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const startTime = Date.now();
      
      const { data, error } = await this.serviceClient!
        .from('user_schema.users')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          details: {
            error: error.message,
            responseTime
          }
        };
      }

      return {
        status: 'healthy',
        details: {
          responseTime,
          connected: true
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connected: false
        }
      };
    }
  }

  // Helper method to set user context for RLS
  public async setUserContext(userId: string, userEmail: string): Promise<SupabaseClient> {
    if (!this.client) {
      throw new AppError('Database client not initialized', 500, 'DATABASE_NOT_INITIALIZED');
    }

    // Create a new client instance with user context
    const userClient = createClient(this.config.url, this.config.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail
        }
      }
    });

    return userClient;
  }

  // Transaction helper
  public async transaction<T>(
    callback: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const client = this.getServiceClient();
    
    try {
      // Supabase doesn't have explicit transactions in the client
      // but we can use the service client for atomic operations
      return await callback(client);
    } catch (error) {
      logger.error('Transaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Factory function for easy initialization
export function createSupabaseService(): SupabaseService {
  const config: DatabaseConfig = {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!
  };

  if (!config.url || !config.serviceRoleKey || !config.anonKey) {
    throw new AppError('Missing required Supabase configuration', 500, 'CONFIG_ERROR');
  }

  return SupabaseService.getInstance(config);
}

// Export singleton instance
export const supabaseService = createSupabaseService();
