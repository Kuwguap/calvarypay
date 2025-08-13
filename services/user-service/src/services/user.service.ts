import { 
  supabaseService, 
  logger, 
  AppError, 
  HttpStatusCode,
  User,
  PaginationQuery,
  PaginationResult
} from '@CalvaryPay/shared';

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UserSearchQuery extends PaginationQuery {
  email?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export class UserService {
  private readonly tableName = 'users';

  async getUserById(userId: string): Promise<User> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from(this.tableName)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(
            'User not found',
            HttpStatusCode.NOT_FOUND,
            'USER_NOT_FOUND'
          );
        }
        throw error;
      }

      return this.mapDatabaseUserToUser(data);

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get user by ID failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get user',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_USER_ERROR'
      );
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        throw error;
      }

      return this.mapDatabaseUserToUser(data);

    } catch (error) {
      logger.error('Get user by email failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    try {
      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.firstName !== undefined) {
        updateData.first_name = updates.firstName;
      }
      if (updates.lastName !== undefined) {
        updateData.last_name = updates.lastName;
      }
      if (updates.phone !== undefined) {
        updateData.phone = updates.phone;
      }

      const { data, error } = await supabaseService.getServiceClient()
        .from(this.tableName)
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(
            'User not found',
            HttpStatusCode.NOT_FOUND,
            'USER_NOT_FOUND'
          );
        }
        throw error;
      }

      const updatedUser = this.mapDatabaseUserToUser(data);

      logger.info('User updated successfully', {
        userId: updatedUser.id,
        updates: Object.keys(updates)
      });

      return updatedUser;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Update user failed', {
        userId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to update user',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'UPDATE_USER_ERROR'
      );
    }
  }

  async searchUsers(query: UserSearchQuery): Promise<PaginationResult<User>> {
    try {
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100); // Max 100 items per page
      const offset = (page - 1) * limit;

      // Build query
      let dbQuery = supabaseService.getServiceClient()
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Apply filters
      if (query.email) {
        dbQuery = dbQuery.ilike('email', `%${query.email}%`);
      }
      if (query.isActive !== undefined) {
        dbQuery = dbQuery.eq('is_active', query.isActive);
      }
      if (query.emailVerified !== undefined) {
        dbQuery = dbQuery.eq('email_verified', query.emailVerified);
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

      const users = (data || []).map(this.mapDatabaseUserToUser);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items: users,
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
      logger.error('Search users failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to search users',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'SEARCH_USERS_ERROR'
      );
    }
  }

  async deactivateUser(userId: string): Promise<User> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from(this.tableName)
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(
            'User not found',
            HttpStatusCode.NOT_FOUND,
            'USER_NOT_FOUND'
          );
        }
        throw error;
      }

      const deactivatedUser = this.mapDatabaseUserToUser(data);

      logger.info('User deactivated successfully', {
        userId: deactivatedUser.id
      });

      return deactivatedUser;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Deactivate user failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to deactivate user',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'DEACTIVATE_USER_ERROR'
      );
    }
  }

  private mapDatabaseUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      phone: dbUser.phone,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      isActive: dbUser.is_active,
      emailVerified: dbUser.email_verified,
      phoneVerified: dbUser.phone_verified,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    };
  }
}
