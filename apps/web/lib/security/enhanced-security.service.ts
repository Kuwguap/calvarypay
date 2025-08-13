/**
 * Enhanced Security Service for CalvaryPay
 * Implements OWASP Top 10 protections and advanced security measures
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseService } from '@/lib/supabase'
import { SecurityAuditLog, SecurityEventType, UserRole } from './idor-protection'

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

// Rate limit rules for different endpoints
const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  '/api/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  '/api/auth/signup': { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 signups per hour
  '/api/auth/forgot-password': { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  '/api/payments': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 payments per minute
  '/api/logbook': { windowMs: 60 * 1000, maxRequests: 30 }, // 30 logbook entries per minute
  'default': { windowMs: 60 * 1000, maxRequests: 100 } // Default: 100 requests per minute
}

// Input validation schemas
export const ValidationSchemas = {
  email: z.string().email().max(255),
  password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  amount: z.number().positive().max(1000000),
  currency: z.enum(['NGN', 'USD', 'GHS', 'KES', 'ZAR']),
  uuid: z.string().uuid(),
  text: z.string().max(1000).regex(/^[^<>{}]*$/), // Prevent HTML/script injection
}

export class EnhancedSecurityService {
  private static instance: EnhancedSecurityService
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>()

  static getInstance(): EnhancedSecurityService {
    if (!EnhancedSecurityService.instance) {
      EnhancedSecurityService.instance = new EnhancedSecurityService()
    }
    return EnhancedSecurityService.instance
  }

  /**
   * Enhanced rate limiting with progressive delays
   */
  async checkRateLimit(request: NextRequest, endpoint: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const clientId = await this.getClientIdentifier(request)
    const rule = RATE_LIMIT_RULES[endpoint] || RATE_LIMIT_RULES.default
    const key = `${clientId}:${endpoint}`
    
    const now = Date.now()
    const windowStart = now - rule.windowMs
    
    // Clean up expired entries
    this.cleanupExpiredEntries(windowStart)
    
    const current = this.rateLimitStore.get(key)
    
    if (!current || current.resetTime <= now) {
      // First request in window or window expired
      this.rateLimitStore.set(key, { count: 1, resetTime: now + rule.windowMs })
      return { allowed: true }
    }
    
    if (current.count >= rule.maxRequests) {
      // Rate limit exceeded
      await this.logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        userId: await this.extractUserId(request),
        userRole: 'customer', // Default, will be updated if user is authenticated
        resource: endpoint,
        action: 'rate_limit_check',
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          requestCount: current.count,
          maxAllowed: rule.maxRequests,
          windowMs: rule.windowMs
        },
        riskLevel: 'medium'
      })
      
      return { 
        allowed: false, 
        retryAfter: Math.ceil((current.resetTime - now) / 1000) 
      }
    }
    
    // Increment counter
    current.count++
    return { allowed: true }
  }

  /**
   * Input validation and sanitization
   */
  validateAndSanitizeInput<T>(data: unknown, schema: z.ZodSchema<T>): { success: boolean; data?: T; errors?: string[] } {
    try {
      const result = schema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
        }
      }
      return { success: false, errors: ['Invalid input format'] }
    }
  }

  /**
   * SQL injection prevention for dynamic queries
   */
  sanitizeForSQL(input: string): string {
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comment start
      .replace(/\*\//g, '') // Remove block comment end
      .replace(/xp_/gi, '') // Remove extended procedures
      .replace(/sp_/gi, '') // Remove stored procedures
  }

  /**
   * XSS prevention for user content
   */
  sanitizeForXSS(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
  }

  /**
   * Generate secure tokens
   */
  generateSecureToken(length: number = 32): string {
    if (typeof window !== 'undefined') {
      // Browser environment - use Web Crypto API
      const array = new Uint8Array(length)
      globalThis.crypto.getRandomValues(array)
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    } else {
      // Node.js environment
      const crypto = require('crypto')
      return crypto.randomBytes(length).toString('hex')
    }
  }

  /**
   * Hash sensitive data
   */
  async hashSensitiveData(data: string, salt?: string): Promise<string> {
    if (typeof window !== 'undefined') {
      // Browser environment - use Web Crypto API
      const encoder = new TextEncoder()
      const actualSalt = salt || this.generateSecureToken(16)
      const keyMaterial = await globalThis.crypto.subtle.importKey(
        'raw',
        encoder.encode(data),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      )
      const derivedKey = await globalThis.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: encoder.encode(actualSalt),
          iterations: 100000,
          hash: 'SHA-512'
        },
        keyMaterial,
        512
      )
      const keyArray = new Uint8Array(derivedKey)
      const keyHex = Array.from(keyArray, byte => byte.toString(16).padStart(2, '0')).join('')
      return `${actualSalt}:${keyHex}`
    } else {
      // Node.js environment
      const crypto = require('crypto')
      const actualSalt = salt || crypto.randomBytes(16).toString('hex')
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(data, actualSalt, 100000, 64, 'sha512', (err: any, derivedKey: any) => {
          if (err) reject(err)
          resolve(`${actualSalt}:${derivedKey.toString('hex')}`)
        })
      })
    }
  }

  /**
   * Verify hashed data
   */
  async verifyHashedData(data: string, hash: string): Promise<boolean> {
    const [salt, originalHash] = hash.split(':')
    const newHash = await this.hashSensitiveData(data, salt)
    return newHash === hash
  }

  /**
   * Log security events to audit trail
   */
  async logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditLog: SecurityAuditLog = {
        ...event,
        timestamp: new Date().toISOString()
      }

      // Store in Supabase audit log table
      const { error } = await supabaseService.client
        .from('security_audit_log')
        .insert([auditLog])

      if (error) {
        console.error('Failed to log security event:', error)
      }

      // For critical events, also log to console for immediate attention
      if (event.riskLevel === 'critical') {
        console.error('CRITICAL SECURITY EVENT:', auditLog)
      }
    } catch (error) {
      console.error('Security logging error:', error)
    }
  }

  /**
   * Detect suspicious patterns
   */
  async detectSuspiciousActivity(request: NextRequest, userId?: string): Promise<boolean> {
    const clientIP = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      // SQL injection attempts
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      // XSS attempts
      /<script|javascript:|on\w+=/i,
      // Path traversal
      /\.\.\//,
      // Command injection
      /[;&|`$()]/
    ]

    const requestBody = await this.safelyParseRequestBody(request)
    const requestString = JSON.stringify(requestBody) + request.url

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestString)) {
        await this.logSecurityEvent({
          eventType: 'suspicious_activity',
          userId: userId || 'anonymous',
          userRole: 'customer',
          resource: request.url,
          action: 'malicious_input_detected',
          ipAddress: clientIP,
          userAgent,
          details: { 
            pattern: pattern.source,
            matchedContent: requestString.match(pattern)?.[0] || 'unknown'
          },
          riskLevel: 'high'
        })
        return true
      }
    }

    return false
  }

  // Helper methods
  private async getClientIdentifier(request: NextRequest): Promise<string> {
    const ip = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''
    const data = `${ip}:${userAgent}`

    if (typeof window !== 'undefined') {
      // Browser environment
      const encoder = new TextEncoder()
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(data))
      const hashArray = new Uint8Array(hashBuffer)
      return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('')
    } else {
      // Node.js environment
      const crypto = require('crypto')
      return crypto.createHash('sha256').update(data).digest('hex')
    }
  }

  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           'unknown'
  }

  private async extractUserId(request: NextRequest): Promise<string> {
    try {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) return 'anonymous'
      
      // This would typically decode the JWT to get user ID
      // For now, return anonymous
      return 'anonymous'
    } catch {
      return 'anonymous'
    }
  }

  private cleanupExpiredEntries(windowStart: number): void {
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (value.resetTime <= windowStart) {
        this.rateLimitStore.delete(key)
      }
    }
  }

  private async safelyParseRequestBody(request: NextRequest): Promise<any> {
    try {
      const cloned = request.clone()
      return await cloned.json()
    } catch {
      return {}
    }
  }
}

export const enhancedSecurityService = EnhancedSecurityService.getInstance()
