/**
 * CalvaryPay Validation Utilities - Server-side Compatible
 * Basic validation schemas for API routes
 */

import { z } from 'zod'

// User roles
export const userRoles = ['customer', 'employee', 'merchant', 'admin'] as const
export type UserRole = typeof userRoles[number]

// Phone number validation for Ghana
const phoneRegex = /^(\+233|0)[2-9]\d{8}$/

// Name validation regex
const nameRegex = /^[a-zA-Z\s\-']+$/

// Basic validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(phoneRegex, 'Please enter a valid Ghana phone number')

export const amountSchema = z
  .number()
  .positive('Amount must be positive')
  .min(0.01, 'Amount must be at least 0.01')

// Sign Up Schema
export const signUpSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(nameRegex, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(nameRegex, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  role: z.enum(userRoles, { required_error: 'Please select an account type' }),
  acceptTerms: z
    .boolean()
    .refine(val => val === true, 'You must accept the terms and conditions')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

// Sign In Schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
})

// Export types
export type SignUpFormData = z.infer<typeof signUpSchema>
export type SignInFormData = z.infer<typeof signInSchema>

// Simple validation function
export function validateField(schema: z.ZodSchema, value: unknown) {
  try {
    schema.parse(value)
    return { isValid: true, error: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Validation failed' }
    }
    return { isValid: false, error: 'Validation failed' }
  }
}
