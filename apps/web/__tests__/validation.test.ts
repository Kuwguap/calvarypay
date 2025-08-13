/**
 * Validation Tests for CalvaryPay
 * Comprehensive tests for form validation schemas and functions
 */

import { describe, it, expect } from '@jest/globals'
import {
  signInSchema,
  signUpSchema,
  validateField,
  emailSchema,
  passwordSchema,
  phoneSchema,
  amountSchema,
} from '../lib/validation-simple'

describe('Email Validation', () => {
  it('should validate correct email addresses', () => {
    const validEmails = [
      'test@calvarypay.com',
      'user@example.org',
      'admin@test.co.uk',
      'user.name@domain.com',
      'user+tag@domain.com',
    ]

    validEmails.forEach(email => {
      const result = validateField(emailSchema, email)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      '',
      'invalid',
      'invalid@',
      '@domain.com',
      'user@',
      'user space@domain.com',
      'user@domain',
    ]

    invalidEmails.forEach(email => {
      const result = validateField(emailSchema, email)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

describe('Password Validation', () => {
  it('should validate strong passwords', () => {
    const validPasswords = [
      'Test123!',
      'MySecure@Pass1',
      'Complex#Password9',
      'Strong$Pass123',
    ]

    validPasswords.forEach(password => {
      const result = validateField(passwordSchema, password)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  it('should reject weak passwords', () => {
    const invalidPasswords = [
      '',
      'short',
      'nouppercase123!',
      'NOLOWERCASE123!',
      'NoNumbers!',
      'NoSpecialChars123',
      'test123', // too short and no special chars
    ]

    invalidPasswords.forEach(password => {
      const result = validateField(passwordSchema, password)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

describe('Phone Validation', () => {
  it('should validate correct phone numbers', () => {
    const validPhones = [
      '+1234567890',
      '+233123456789',
      '+44123456789',
      '1234567890',
      '233123456789',
    ]

    validPhones.forEach(phone => {
      const result = validateField(phoneSchema, phone)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  it('should reject invalid phone numbers', () => {
    const invalidPhones = [
      '',
      '123',
      'abc123',
      '+',
      '++123456789',
      '123-456-7890', // contains dashes
    ]

    invalidPhones.forEach(phone => {
      const result = validateField(phoneSchema, phone)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

describe('Amount Validation', () => {
  it('should validate correct amounts', () => {
    const validAmounts = [0.01, 1, 100, 1000, 999999]

    validAmounts.forEach(amount => {
      const result = validateField(amountSchema, amount)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  it('should reject invalid amounts', () => {
    const invalidAmounts = [0, -1, -100, 1000001]

    invalidAmounts.forEach(amount => {
      const result = validateField(amountSchema, amount)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

describe('Sign In Form Validation', () => {
  it('should validate correct sign in data', () => {
    const validData = {
      email: 'test@calvarypay.com',
      password: 'Test123!',
      rememberMe: true,
    }

    const result = validateForm(signInSchema, validData)
    expect(result.isValid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
    expect(result.data).toEqual(validData)
  })

  it('should reject invalid sign in data', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'weak',
      rememberMe: false,
    }

    const result = validateForm(signInSchema, invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors.email).toBeDefined()
    expect(result.errors.password).toBeDefined()
  })
})

describe('Sign Up Form Validation', () => {
  it('should validate correct sign up data', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@calvarypay.com',
      phone: '+233123456789',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      role: 'customer' as const,
      acceptTerms: true,
    }

    const result = validateForm(signUpSchema, validData)
    expect(result.isValid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  it('should reject mismatched passwords', () => {
    const invalidData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@calvarypay.com',
      phone: '+233123456789',
      password: 'SecurePass123!',
      confirmPassword: 'DifferentPass123!',
      role: 'customer' as const,
      acceptTerms: true,
    }

    const result = validateForm(signUpSchema, invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors.confirmPassword).toBeDefined()
  })

  it('should require terms acceptance', () => {
    const invalidData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@calvarypay.com',
      phone: '+233123456789',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      role: 'customer' as const,
      acceptTerms: false,
    }

    const result = validateForm(signUpSchema, invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors.acceptTerms).toBeDefined()
  })
})

describe('Payment Form Validation', () => {
  it('should validate correct payment data', () => {
    const validData = {
      amount: 100.50,
      currency: 'GHS' as const,
      description: 'Test payment',
      category: 'fuel' as const,
      channel: 'card' as const,
      metadata: { orderId: '123' },
    }

    const result = validateForm(paymentSchema, validData)
    expect(result.isValid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  it('should reject invalid payment data', () => {
    const invalidData = {
      amount: 0,
      currency: 'INVALID',
      description: '',
      category: 'invalid',
      channel: 'invalid',
    }

    const result = validateForm(paymentSchema, invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errors.amount).toBeDefined()
    expect(result.errors.currency).toBeDefined()
    expect(result.errors.description).toBeDefined()
    expect(result.errors.category).toBeDefined()
    expect(result.errors.channel).toBeDefined()
  })
})
