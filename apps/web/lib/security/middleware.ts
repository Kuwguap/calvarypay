/**
 * CalvaryPay Security Middleware
 * Implements OWASP Top 10 protections and CORS policies
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enhancedSecurityService } from './enhanced-security.service'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'

// Enhanced CORS Configuration with environment-specific origins
const CORS_CONFIG = {
  allowedOrigins: process.env.NODE_ENV === 'production'
    ? [
        'https://calvarypay.com',
        'https://www.calvarypay.com',
        'https://app.calvarypay.com'
      ]
    : [
        'http://localhost:3005',
        'http://localhost:3000',
        'http://localhost:3007',
        'https://calvarypay.com',
        'https://www.calvarypay.com'
      ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token'
  ],
  maxAge: 86400, // 24 hours
  credentials: true
}

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Input sanitization patterns
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi
]

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
  /(--|\/\*|\*\/|;)/g,
  /(\b(OR|AND)\b.*=.*)/gi,
  /('|(\\')|('')|(%27)|(%2527))/gi
]

export class SecurityMiddleware {
  /**
   * Apply CORS headers to response
   */
  static applyCORS(request: NextRequest, response: NextResponse): NextResponse {
    const origin = request.headers.get('origin')
    
    // Check if origin is allowed
    if (origin && CORS_CONFIG.allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else if (!origin) {
      // Allow same-origin requests
      response.headers.set('Access-Control-Allow-Origin', '*')
    }
    
    response.headers.set('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '))
    response.headers.set('Access-Control-Max-Age', CORS_CONFIG.maxAge.toString())
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    return response
  }

  /**
   * Handle preflight OPTIONS requests
   */
  static handlePreflight(request: NextRequest): NextResponse | null {
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      return this.applyCORS(request, response)
    }
    return null
  }

  /**
   * Rate limiting protection
   */
  static checkRateLimit(request: NextRequest, maxRequests = 100, windowMs = 900000): boolean {
    const clientIP = this.getClientIP(request)
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Clean old entries
    for (const [ip, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(ip)
      }
    }
    
    const clientData = rateLimitStore.get(clientIP)
    
    if (!clientData || clientData.resetTime < now) {
      // New window
      rateLimitStore.set(clientIP, { count: 1, resetTime: now + windowMs })
      return true
    }
    
    if (clientData.count >= maxRequests) {
      return false
    }
    
    clientData.count++
    return true
  }

  /**
   * Get client IP address
   */
  static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    if (realIP) {
      return realIP
    }
    
    return request.ip || 'unknown'
  }

  /**
   * Sanitize input to prevent XSS
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      let sanitized = input
      
      // Remove dangerous patterns
      DANGEROUS_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '')
      })
      
      // HTML encode special characters
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
      
      return sanitized.trim()
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item))
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value)
      }
      return sanitized
    }
    
    return input
  }

  /**
   * Check for SQL injection attempts
   */
  static detectSQLInjection(input: string): boolean {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
  }

  /**
   * Validate and sanitize request body
   */
  static async validateRequestBody(request: NextRequest, schema?: z.ZodSchema): Promise<any> {
    try {
      const body = await request.json()
      
      // Check for SQL injection in all string values
      const checkForSQLInjection = (obj: any): boolean => {
        if (typeof obj === 'string') {
          return this.detectSQLInjection(obj)
        }
        if (Array.isArray(obj)) {
          return obj.some(item => checkForSQLInjection(item))
        }
        if (typeof obj === 'object' && obj !== null) {
          return Object.values(obj).some(value => checkForSQLInjection(value))
        }
        return false
      }
      
      if (checkForSQLInjection(body)) {
        throw new Error('Potential SQL injection detected')
      }
      
      // Sanitize input
      const sanitizedBody = this.sanitizeInput(body)
      
      // Validate with schema if provided
      if (schema) {
        return schema.parse(sanitizedBody)
      }
      
      return sanitizedBody
    } catch (error) {
      throw new Error(`Invalid request body: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Add security headers to response
   */
  static addSecurityHeaders(response: NextResponse): NextResponse {
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY')
    
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff')
    
    // XSS protection
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Enhanced Content Security Policy (removed unsafe directives)
    const nonce = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2, 15)
    response.headers.set('Content-Security-Policy',
      "default-src 'self'; " +
      `script-src 'self' 'nonce-${nonce}' https://js.paystack.co; ` +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' https://api.paystack.co https://ounhhutmnyedcntvzpni.supabase.co wss://ounhhutmnyedcntvzpni.supabase.co; " +
      "frame-src 'self' https://js.paystack.co; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "object-src 'none'; " +
      "media-src 'self'; " +
      "worker-src 'self'; " +
      "manifest-src 'self'; " +
      "upgrade-insecure-requests"
    )

    // Add nonce to response for script tags
    response.headers.set('X-CSP-Nonce', nonce)
    
    // HSTS (only in production)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    
    return response
  }

  /**
   * Create error response with security headers
   */
  static createErrorResponse(message: string, status: number, request: NextRequest): NextResponse {
    const response = NextResponse.json(
      { 
        error: { 
          message,
          timestamp: new Date().toISOString(),
          requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2, 15)
        } 
      },
      { status }
    )
    
    return this.addSecurityHeaders(this.applyCORS(request, response))
  }

  /**
   * Create success response with security headers
   */
  static createSuccessResponse(data: any, request: NextRequest): NextResponse {
    const response = NextResponse.json(data)
    return this.addSecurityHeaders(this.applyCORS(request, response))
  }
}

// Export utility functions
export const {
  applyCORS,
  handlePreflight,
  checkRateLimit,
  sanitizeInput,
  validateRequestBody,
  addSecurityHeaders,
  createErrorResponse,
  createSuccessResponse
} = SecurityMiddleware
