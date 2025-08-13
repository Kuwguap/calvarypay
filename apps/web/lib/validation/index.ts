/**
 * Comprehensive Validation Schemas for CalvaryPay
 * Provides real-time validation with detailed error messages
 */

import { z } from 'zod'

// Phone number validation for Ghana
const phoneRegex = /^(\+233|0)[2-9]\d{8}$/

// Password validation - strong password requirements
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

// Email validation - comprehensive email pattern
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Name validation - allows letters, spaces, hyphens, apostrophes
const nameRegex = /^[a-zA-Z\s\-']+$/

// User roles
export const userRoles = ['customer', 'employee', 'merchant', 'admin'] as const
export type UserRole = typeof userRoles[number]

// Base Sign Up Schema (without refinements)
export const signUpBaseSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(nameRegex, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),

  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(nameRegex, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .regex(emailRegex, 'Please enter a valid email format')
    .max(100, 'Email must be less than 100 characters')
    .transform(val => val.toLowerCase().trim()),

  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Please enter a valid Ghana phone number (e.g., +233 123 456 789 or 0123456789)')
    .transform(val => val.replace(/\s/g, '')), // Remove spaces

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),

  role: z
    .enum(userRoles, { errorMap: () => ({ message: 'Please select a valid account type' }) }),

  acceptTerms: z
    .boolean()
    .refine(val => val === true, 'You must accept the terms and conditions')
})

// Sign Up Schema with refinements
export const signUpSchema = signUpBaseSchema.refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export type SignUpFormData = z.infer<typeof signUpSchema>

// Sign In Schema
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform(val => val.toLowerCase().trim()),
  
  password: z
    .string()
    .min(1, 'Password is required'),
  
  rememberMe: z.boolean().optional()
})

export type SignInFormData = z.infer<typeof signInSchema>

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform(val => val.toLowerCase().trim())
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

// Reset Password Schema
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  
  token: z
    .string()
    .min(1, 'Reset token is required')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

// Payment Schema
export const paymentSchema = z.object({
  amount: z
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(100000, 'Amount cannot exceed ₵100,000')
    .multipleOf(0.01, 'Amount can only have up to 2 decimal places'),
  
  recipient: z
    .string()
    .min(1, 'Recipient is required')
    .max(100, 'Recipient must be less than 100 characters'),
  
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters')
    .transform(val => val.trim()),
  
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
})

export type PaymentFormData = z.infer<typeof paymentSchema>

// Profile Update Schema
export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(nameRegex, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),
  
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(nameRegex, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),
  
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Please enter a valid Ghana phone number')
    .transform(val => val.replace(/\s/g, '')),
  
  currentPassword: z
    .string()
    .optional(),
  
  newPassword: z
    .string()
    .optional(),
  
  confirmNewPassword: z
    .string()
    .optional()
}).refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return false
  }
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    return false
  }
  if (data.newPassword && data.newPassword.length < 8) {
    return false
  }
  return true
}, {
  message: 'Password validation failed',
  path: ['newPassword']
})

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>

// Validation helper functions
export interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateField(schema: z.ZodSchema, value: any): ValidationResult {
  try {
    schema.parse(value)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Validation failed' }
    }
    return { isValid: false, error: 'Validation failed' }
  }
}

export function validateForm<T>(schema: z.ZodSchema<T>, data: any): { isValid: boolean; errors: Record<string, string>; data?: T } {
  try {
    const validatedData = schema.parse(data)
    return { isValid: true, errors: {}, data: validatedData }
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

// Real-time validation debounce helper
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Field validation states
export interface FieldValidationState {
  isValid: boolean
  isValidating: boolean
  error?: string
  touched: boolean
}

export function createInitialFieldState(): FieldValidationState {
  return {
    isValid: false,
    isValidating: false,
    touched: false
  }
}

// Common validation patterns
export const validationPatterns = {
  email: emailRegex,
  phone: phoneRegex,
  password: passwordRegex,
  name: nameRegex
}

// Error messages
export const errorMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid Ghana phone number',
  password: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  passwordMatch: 'Passwords do not match',
  terms: 'You must accept the terms and conditions',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be less than ${max} characters`,
  min: (min: number) => `Must be at least ${min}`,
  max: (max: number) => `Cannot exceed ${max}`
}
