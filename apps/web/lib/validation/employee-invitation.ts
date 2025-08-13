import { z } from 'zod'

// Regular expressions for validation
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const nameRegex = /^[a-zA-Z\s\-']+$/
const departmentRegex = /^[a-zA-Z0-9\s\-_&()]+$/

// Employee invitation validation schema
export const employeeInvitationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .regex(emailRegex, 'Please enter a valid email format')
    .max(100, 'Email must be less than 100 characters')
    .transform(val => val.toLowerCase().trim()),

  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(nameRegex, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(nameRegex, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),

  department: z
    .string()
    .optional()
    .refine(val => !val || val.trim().length === 0 || (val.trim().length >= 2 && val.trim().length <= 50), {
      message: 'Department must be between 2 and 50 characters'
    })
    .refine(val => !val || departmentRegex.test(val.trim()), {
      message: 'Department can only contain letters, numbers, spaces, and common symbols'
    })
    .transform(val => val?.trim() || null),

  spendingLimit: z
    .union([
      z.string(),
      z.number(),
      z.null(),
      z.undefined()
    ])
    .optional()
    .refine(val => {
      if (!val || val === '' || val === null || val === undefined) return true
      const num = typeof val === 'string' ? parseFloat(val) : val
      return !isNaN(num) && num > 0 && num <= 1000000
    }, {
      message: 'Spending limit must be a positive number up to 1,000,000'
    })
    .transform(val => {
      if (!val || val === '' || val === null || val === undefined) return null
      const num = typeof val === 'string' ? parseFloat(val) : val
      return isNaN(num) ? null : num
    })
})

export type EmployeeInvitationData = z.infer<typeof employeeInvitationSchema>

// Real-time field validation
export const fieldValidationSchemas = {
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .regex(emailRegex, 'Please enter a valid email format')
    .max(100, 'Email must be less than 100 characters'),

  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(nameRegex, 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(nameRegex, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  department: z
    .string()
    .refine(val => !val || val.trim().length === 0 || (val.trim().length >= 2 && val.trim().length <= 50), {
      message: 'Department must be between 2 and 50 characters'
    })
    .refine(val => !val || departmentRegex.test(val.trim()), {
      message: 'Department can only contain letters, numbers, spaces, and common symbols'
    }),

  spendingLimit: z
    .string()
    .refine(val => {
      if (!val || val.trim() === '') return true
      const num = parseFloat(val)
      return !isNaN(num) && num > 0 && num <= 1000000
    }, {
      message: 'Spending limit must be a positive number up to 1,000,000'
    })
}

// Validation helper function
export function validateEmployeeInvitationField(field: keyof typeof fieldValidationSchemas, value: string): { isValid: boolean; error?: string } {
  try {
    const schema = fieldValidationSchemas[field]
    if (!schema) {
      return { isValid: true }
    }
    
    schema.parse(value)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Validation failed' }
    }
    return { isValid: false, error: 'Validation failed' }
  }
}

// Full form validation
export function validateEmployeeInvitationForm(data: any): { isValid: boolean; errors: Record<string, string>; validatedData?: EmployeeInvitationData } {
  try {
    const validatedData = employeeInvitationSchema.parse(data)
    return { isValid: true, errors: {}, validatedData }
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

// Email search validation
export const emailSearchSchema = z
  .string()
  .min(3, 'Enter at least 3 characters to search')
  .email('Please enter a valid email format')
  .max(100, 'Email must be less than 100 characters')

export function validateEmailSearch(email: string): { isValid: boolean; error?: string } {
  try {
    emailSearchSchema.parse(email)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Invalid email format' }
    }
    return { isValid: false, error: 'Invalid email format' }
  }
}

// Department suggestions
export const commonDepartments = [
  'Finance',
  'Human Resources',
  'Marketing',
  'Sales',
  'Operations',
  'IT',
  'Customer Service',
  'Administration',
  'Legal',
  'Research & Development'
]

// Spending limit presets (in GHS)
export const spendingLimitPresets = [
  { label: '₵500 - Basic', value: 500 },
  { label: '₵1,000 - Standard', value: 1000 },
  { label: '₵2,500 - Enhanced', value: 2500 },
  { label: '₵5,000 - Premium', value: 5000 },
  { label: '₵10,000 - Executive', value: 10000 }
]
