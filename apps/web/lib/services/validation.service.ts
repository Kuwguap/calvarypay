/**
 * Comprehensive Validation Service for CalvaryPay
 * Handles all validation gaps and forward step validation
 */

import { z } from 'zod'
import { 
  employeeTransferSchema, 
  companyDepositSchema, 
  budgetAllocationSchema,
  validateTransferLimits,
  calculateTransferFee,
  validateRecipientEligibility,
  type TransferLimits
} from '@/lib/validation/transfer-validation'

export class ValidationService {
  private static instance: ValidationService

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService()
    }
    return ValidationService.instance
  }

  /**
   * Validate employee transfer with comprehensive checks
   */
  validateEmployeeTransfer(data: any): { 
    isValid: boolean; 
    errors: Record<string, string>; 
    validatedData?: any;
    fee?: number;
    totalAmount?: number;
  } {
    try {
      // Validate basic schema
      const validatedData = employeeTransferSchema.parse(data)
      
      // Additional business logic validations
      const businessErrors: Record<string, string> = {}
      
      // Check if amount is within reasonable limits
      if (validatedData.amount > 100000) {
        businessErrors.amount = 'Amount exceeds reasonable limit. Please contact support for large transfers.'
      }
      
      // Validate reason content (no profanity, etc.)
      if (this.containsInappropriateContent(validatedData.reason)) {
        businessErrors.reason = 'Transfer reason contains inappropriate content'
      }
      
      // Calculate fees
      const { fee, totalAmount } = calculateTransferFee(
        validatedData.amount,
        'employee_to_employee',
        validatedData.isUrgent
      )
      
      if (businessErrors.amount || businessErrors.reason) {
        return {
          isValid: false,
          errors: businessErrors
        }
      }
      
      return {
        isValid: true,
        errors: {},
        validatedData,
        fee,
        totalAmount
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        return { isValid: false, errors }
      }
      return { isValid: false, errors: { general: 'Validation failed' } }
    }
  }

  /**
   * Validate company deposit with comprehensive checks
   */
  validateCompanyDeposit(data: any): { 
    isValid: boolean; 
    errors: Record<string, string>; 
    validatedData?: any;
  } {
    try {
      const validatedData = companyDepositSchema.parse(data)
      
      // Additional business logic validations
      const businessErrors: Record<string, string> = {}
      
      // Check if amount is within company limits
      if (validatedData.amount > 500000) {
        businessErrors.amount = 'Company deposit amount exceeds limit. Please contact support.'
      }
      
      // Validate description content
      if (validatedData.description && this.containsInappropriateContent(validatedData.description)) {
        businessErrors.description = 'Description contains inappropriate content'
      }
      
      if (businessErrors.amount || businessErrors.description) {
        return {
          isValid: false,
          errors: businessErrors
        }
      }
      
      return {
        isValid: true,
        errors: {},
        validatedData
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        return { isValid: false, errors }
      }
      return { isValid: false, errors: { general: 'Validation failed' } }
    }
  }

  /**
   * Validate budget allocation with comprehensive checks
   */
  validateBudgetAllocation(data: any): { 
    isValid: boolean; 
    errors: Record<string, string>; 
    validatedData?: any;
  } {
    try {
      const validatedData = budgetAllocationSchema.parse(data)
      
      // Additional business logic validations
      const businessErrors: Record<string, string> = {}
      
      // Check if amount is reasonable for budget type
      if (validatedData.budgetType === 'fuel' && validatedData.amount > 50000) {
        businessErrors.amount = 'Fuel budget allocation exceeds reasonable limit'
      }
      
      if (validatedData.budgetType === 'maintenance' && validatedData.amount > 200000) {
        businessErrors.amount = 'Maintenance budget allocation exceeds reasonable limit'
      }
      
      // Validate expiry date if provided
      if (validatedData.expiryDate) {
        const expiryDate = new Date(validatedData.expiryDate)
        const now = new Date()
        if (expiryDate <= now) {
          businessErrors.expiryDate = 'Expiry date must be in the future'
        }
        
        // Check if expiry is not too far in the future
        const maxExpiry = new Date()
        maxExpiry.setFullYear(maxExpiry.getFullYear() + 1)
        if (expiryDate > maxExpiry) {
          businessErrors.expiryDate = 'Expiry date cannot be more than 1 year in the future'
        }
      }
      
      if (Object.keys(businessErrors).length > 0) {
        return {
          isValid: false,
          errors: businessErrors
        }
      }
      
      return {
        isValid: true,
        errors: {},
        validatedData
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        return { isValid: false, errors }
      }
      return { isValid: false, errors: { general: 'Validation failed' } }
    }
  }

  /**
   * Validate transfer limits
   */
  validateTransferLimits(
    amount: number,
    dailyTotal: number,
    monthlyTotal: number,
    limits: TransferLimits
  ): { isValid: boolean; error?: string } {
    return validateTransferLimits(amount, dailyTotal, monthlyTotal, limits)
  }

  /**
   * Validate recipient eligibility
   */
  validateRecipientEligibility(
    recipientRole: string,
    recipientCompanyId: string | null,
    senderCompanyId: string | null
  ): { isValid: boolean; error?: string } {
    return validateRecipientEligibility(recipientRole, recipientCompanyId, senderCompanyId)
  }

  /**
   * Content moderation check
   */
  private containsInappropriateContent(text: string): boolean {
    const inappropriateWords = [
      'spam', 'scam', 'fraud', 'hack', 'crack', 'illegal', 'unauthorized'
    ]
    
    const lowerText = text.toLowerCase()
    return inappropriateWords.some(word => lowerText.includes(word))
  }

  /**
   * Validate phone number format (Ghana)
   */
  validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
    const phoneRegex = /^(\+233|0)[2-9]\d{8}$/
    
    if (!phoneRegex.test(phone)) {
      return {
        isValid: false,
        error: 'Please enter a valid Ghana phone number (e.g., +233 123 456 789 or 0123456789)'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: 'Please enter a valid email address'
      }
    }
    
    // Check for disposable email domains
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']
    const domain = email.split('@')[1]
    
    if (disposableDomains.includes(domain)) {
      return {
        isValid: false,
        error: 'Disposable email addresses are not allowed'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Validate amount with currency-specific rules
   */
  validateAmount(amount: number, currency: string): { isValid: boolean; error?: string } {
    if (amount <= 0) {
      return {
        isValid: false,
        error: 'Amount must be greater than 0'
      }
    }
    
    if (amount > 1000000) {
      return {
        isValid: false,
        error: 'Amount cannot exceed 1,000,000'
      }
    }
    
    // Currency-specific validations
    switch (currency) {
      case 'GHS':
        // Ghana Cedi - check for reasonable amounts
        if (amount > 500000) {
          return {
            isValid: false,
            error: 'Amount exceeds reasonable limit for Ghana Cedi'
          }
        }
        break
      case 'USD':
        // US Dollar - check for reasonable amounts
        if (amount > 100000) {
          return {
            isValid: false,
            error: 'Amount exceeds reasonable limit for US Dollar'
          }
        }
        break
      case 'NGN':
        // Nigerian Naira - check for reasonable amounts
        if (amount > 50000000) {
          return {
            isValid: false,
            error: 'Amount exceeds reasonable limit for Nigerian Naira'
          }
        }
        break
    }
    
    return { isValid: true }
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance() 