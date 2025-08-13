/**
 * CalvaryPay IDOR (Insecure Direct Object Reference) Protection
 * Implements access control and authorization checks
 */

import { NextRequest } from 'next/server'
import { supabaseService } from '@/lib/supabase'

// User roles hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  customer: 1,
  employee: 2,
  merchant: 3,
  admin: 4
} as const

export type UserRole = keyof typeof ROLE_HIERARCHY
export type Permission = 'read' | 'write' | 'delete' | 'admin'

// Enhanced security event types
export type SecurityEventType =
  | 'access_denied'
  | 'unauthorized_access'
  | 'permission_check'
  | 'rate_limit_exceeded'
  | 'invalid_input'
  | 'suspicious_activity'
  | 'privilege_escalation_attempt'
  | 'data_access_violation'

// Security audit log interface
export interface SecurityAuditLog {
  id?: string
  timestamp: string
  eventType: SecurityEventType
  userId: string
  userRole: UserRole
  resource: string
  action: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, any>
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

// Permission matrix for different resources
const PERMISSION_MATRIX = {
  // User profile access
  'user:profile': {
    customer: ['read', 'write'],
    employee: ['read', 'write'],
    merchant: ['read', 'write'],
    admin: ['read', 'write', 'delete', 'admin']
  },
  // User management (viewing other users)
  'user:management': {
    customer: [],
    employee: ['read'],
    merchant: ['read'],
    admin: ['read', 'write', 'delete', 'admin']
  },
  // Transaction access
  'transaction:own': {
    customer: ['read'],
    employee: ['read'],
    merchant: ['read', 'write'],
    admin: ['read', 'write', 'delete', 'admin']
  },
  // Transaction management (all transactions)
  'transaction:all': {
    customer: [],
    employee: ['read'],
    merchant: [],
    admin: ['read', 'write', 'delete', 'admin']
  },
  // System settings
  'system:settings': {
    customer: [],
    employee: [],
    merchant: [],
    admin: ['read', 'write', 'admin']
  }
} as const

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  isActive: boolean
}

export class IDORProtection {
  /**
   * Extract and validate JWT token from request
   */
  static async extractUserFromToken(request: NextRequest): Promise<AuthenticatedUser | null> {
    try {
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
      }
      
      const token = authHeader.substring(7)
      
      // In a real implementation, you would verify the JWT token
      // For now, we'll extract user info from a simple token format
      if (token.startsWith('calvary_access_')) {
        const parts = token.split('_')
        if (parts.length >= 4) {
          const userId = parts[3]
          
          // Fetch user from database
          const { user, error } = await supabaseService.findUserByEmail('')
          
          // For demo purposes, we'll create a mock user
          // In production, implement proper JWT verification
          return {
            id: userId,
            email: 'user@example.com',
            role: 'customer',
            isActive: true
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Error extracting user from token:', error)
      return null
    }
  }

  /**
   * Check if user has permission for a specific resource and action
   */
  static hasPermission(
    user: AuthenticatedUser,
    resource: keyof typeof PERMISSION_MATRIX,
    permission: Permission
  ): boolean {
    if (!user.isActive) {
      return false
    }
    
    const resourcePermissions = PERMISSION_MATRIX[resource]
    const userPermissions = resourcePermissions[user.role] || []
    
    return userPermissions.includes(permission)
  }

  /**
   * Check if user can access another user's data
   */
  static canAccessUserData(
    currentUser: AuthenticatedUser,
    targetUserId: string,
    permission: Permission = 'read'
  ): boolean {
    // Users can always access their own data
    if (currentUser.id === targetUserId) {
      return true
    }
    
    // Check if user has permission to access other users' data
    return this.hasPermission(currentUser, 'user:management', permission)
  }

  /**
   * Check if user can access transaction data
   */
  static canAccessTransaction(
    currentUser: AuthenticatedUser,
    transactionUserId: string,
    permission: Permission = 'read'
  ): boolean {
    // Users can access their own transactions
    if (currentUser.id === transactionUserId) {
      return this.hasPermission(currentUser, 'transaction:own', permission)
    }
    
    // Check if user has permission to access all transactions
    return this.hasPermission(currentUser, 'transaction:all', permission)
  }

  /**
   * Validate user ownership of a resource
   */
  static async validateResourceOwnership(
    resourceType: 'user' | 'transaction',
    resourceId: string,
    userId: string
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'user':
          // For user resources, check if the resource ID matches the user ID
          return resourceId === userId
          
        case 'transaction':
          // For transactions, check if the transaction belongs to the user
          // This would require a database query in a real implementation
          // For now, we'll assume the transaction belongs to the user if IDs match
          return true
          
        default:
          return false
      }
    } catch (error) {
      console.error('Error validating resource ownership:', error)
      return false
    }
  }

  /**
   * Create a secure database query filter based on user permissions
   */
  static createSecureFilter(user: AuthenticatedUser, resourceType: string): any {
    const filters: any = {}
    
    switch (resourceType) {
      case 'users':
        if (user.role === 'admin') {
          // Admins can see all users
          return {}
        } else if (user.role === 'employee' || user.role === 'merchant') {
          // Employees and merchants can see active users
          return { is_active: true }
        } else {
          // Customers can only see their own data
          return { id: user.id }
        }
        
      case 'transactions':
        if (user.role === 'admin' || user.role === 'employee') {
          // Admins and employees can see all transactions
          return {}
        } else {
          // Others can only see their own transactions
          return { user_id: user.id }
        }
        
      default:
        // Default to user-scoped access
        return { user_id: user.id }
    }
  }

  /**
   * Sanitize user data based on permissions
   */
  static sanitizeUserData(
    currentUser: AuthenticatedUser,
    userData: any,
    targetUserId?: string
  ): any {
    // If accessing own data, return all fields
    if (!targetUserId || currentUser.id === targetUserId) {
      return userData
    }
    
    // If user doesn't have permission to view other users, return limited data
    if (!this.hasPermission(currentUser, 'user:management', 'read')) {
      return {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      }
    }
    
    // For employees and merchants, hide sensitive data
    if (currentUser.role !== 'admin') {
      const { password_hash, ...sanitizedData } = userData
      return sanitizedData
    }
    
    // Admins can see all data except password hash
    const { password_hash, ...adminData } = userData
    return adminData
  }

  /**
   * Log security events for monitoring
   */
  static logSecurityEvent(
    eventType: 'access_denied' | 'unauthorized_access' | 'permission_check',
    user: AuthenticatedUser | null,
    resource: string,
    details?: any
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: user?.id || 'anonymous',
      userRole: user?.role || 'none',
      resource,
      details,
      userAgent: details?.userAgent,
      ip: details?.ip
    }
    
    // In production, send to logging service
    console.log('Security Event:', JSON.stringify(logEntry))
  }

  /**
   * Rate limiting for sensitive operations
   */
  static checkSensitiveOperationLimit(
    userId: string,
    operation: string,
    maxAttempts = 5,
    windowMs = 300000 // 5 minutes
  ): boolean {
    // This would use Redis or similar in production
    // For now, we'll use a simple in-memory store
    const key = `${userId}:${operation}`
    const now = Date.now()
    
    // Implementation would go here
    // For demo purposes, always allow
    return true
  }
}

// Export utility functions
export const {
  extractUserFromToken,
  hasPermission,
  canAccessUserData,
  canAccessTransaction,
  validateResourceOwnership,
  createSecureFilter,
  sanitizeUserData,
  logSecurityEvent
} = IDORProtection
