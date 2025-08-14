/**
 * Comprehensive Validation Middleware
 * Handles all validation gaps and provides forward step validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { validationService } from '@/lib/services/validation.service'
import { 
  employeeTransferSchema, 
  companyDepositSchema, 
  budgetAllocationSchema 
} from '@/lib/validation/transfer-validation'

export class ValidationMiddleware {
  /**
   * Validate request body against a schema
   */
  static async validateRequestBody<T>(
    request: NextRequest, 
    schema: any
  ): Promise<{ isValid: boolean; data?: T; errors?: Record<string, string> }> {
    try {
      const body = await request.json()
      const result = schema.parse(body)
      return { isValid: true, data: result }
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        return { isValid: false, errors }
      }
      return { isValid: false, errors: { general: 'Invalid request body' } }
    }
  }

  /**
   * Validate employee transfer request
   */
  static async validateEmployeeTransfer(request: NextRequest) {
    const body = await request.json()
    return validationService.validateEmployeeTransfer(body)
  }

  /**
   * Validate company deposit request
   */
  static async validateCompanyDeposit(request: NextRequest) {
    const body = await request.json()
    return validationService.validateCompanyDeposit(body)
  }

  /**
   * Validate budget allocation request
   */
  static async validateBudgetAllocation(request: NextRequest) {
    const body = await request.json()
    return validationService.validateBudgetAllocation(body)
  }

  /**
   * Validate query parameters
   */
  static validateQueryParams(
    searchParams: URLSearchParams,
    requiredParams: string[],
    optionalParams: Record<string, any> = {}
  ): { isValid: boolean; params?: any; errors?: string[] } {
    const errors: string[] = []
    const params: any = {}

    // Check required parameters
    for (const param of requiredParams) {
      const value = searchParams.get(param)
      if (!value) {
        errors.push(`Missing required parameter: ${param}`)
      } else {
        params[param] = value
      }
    }

    // Check optional parameters with validation
    for (const [param, validator] of Object.entries(optionalParams)) {
      const value = searchParams.get(param)
      if (value && validator) {
        const validation = validator(value)
        if (!validation.isValid) {
          errors.push(`Invalid ${param}: ${validation.error}`)
        } else {
          params[param] = value
        }
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return { isValid: true, params }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(
    searchParams: URLSearchParams
  ): { isValid: boolean; limit?: number; offset?: number; errors?: string[] } {
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const errors: string[] = []

    if (limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100')
    }

    if (offset < 0) {
      errors.push('Offset must be non-negative')
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return { isValid: true, limit, offset }
  }

  /**
   * Validate date range parameters
   */
  static validateDateRange(
    searchParams: URLSearchParams
  ): { isValid: boolean; startDate?: Date; endDate?: Date; errors?: string[] } {
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    const errors: string[] = []

    if (startDateStr) {
      const startDate = new Date(startDateStr)
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date format')
      }
    }

    if (endDateStr) {
      const endDate = new Date(endDateStr)
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end date format')
      }
    }

    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr)
      const endDate = new Date(endDateStr)
      if (startDate > endDate) {
        errors.push('Start date must be before end date')
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return {
      isValid: true,
      startDate: startDateStr ? new Date(startDateStr) : undefined,
      endDate: endDateStr ? new Date(endDateStr) : undefined
    }
  }

  /**
   * Validate amount with currency
   */
  static validateAmount(amount: any, currency: string): { isValid: boolean; error?: string } {
    return validationService.validateAmount(amount, currency)
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    return validationService.validateEmail(email)
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): { isValid: boolean; error?: string } {
    return validationService.validatePhoneNumber(phone)
  }

  /**
   * Create validation error response
   */
  static createValidationErrorResponse(
    errors: Record<string, string> | string[],
    status: number = 400
  ): NextResponse {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      },
      { status }
    )
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return data.trim().replace(/[<>]/g, '')
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item))
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value)
      }
      return sanitized
    }
    
    return data
  }

  /**
   * Check for SQL injection patterns
   */
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|#|\/\*|\*\/)/,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Check for XSS patterns
   */
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
    ]
    
    return xssPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Comprehensive input validation and sanitization
   */
  static async validateAndSanitizeRequest(
    request: NextRequest,
    schema?: any
  ): Promise<{ 
    isValid: boolean; 
    data?: any; 
    errors?: Record<string, string>;
    sanitizedData?: any;
  }> {
    try {
      const body = await request.json()
      
      // Check for malicious patterns
      const bodyString = JSON.stringify(body)
      if (this.detectSQLInjection(bodyString)) {
        return { 
          isValid: false, 
          errors: { security: 'Potential SQL injection detected' } 
        }
      }
      
      if (this.detectXSS(bodyString)) {
        return { 
          isValid: false, 
          errors: { security: 'Potential XSS attack detected' } 
        }
      }
      
      // Sanitize input
      const sanitizedData = this.sanitizeInput(body)
      
      // Validate against schema if provided
      if (schema) {
        try {
          const validatedData = schema.parse(sanitizedData)
          return { 
            isValid: true, 
            data: validatedData, 
            sanitizedData 
          }
        } catch (error: any) {
          if (error.errors) {
            const errors: Record<string, string> = {}
            error.errors.forEach((err: any) => {
              const path = err.path.join('.')
              errors[path] = err.message
            })
            return { isValid: false, errors, sanitizedData }
          }
          return { 
            isValid: false, 
            errors: { general: 'Schema validation failed' },
            sanitizedData 
          }
        }
      }
      
      return { isValid: true, data: body, sanitizedData }
    } catch (error) {
      return { 
        isValid: false, 
        errors: { general: 'Failed to parse request body' } 
      }
    }
  }
} 