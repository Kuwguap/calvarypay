/**
 * Comprehensive Transfer Validation Schemas
 * Fills validation gaps for employee transfers, deposits, and company operations
 */

import { z } from 'zod'

// Currency validation - supported currencies
export const supportedCurrencies = ['GHS', 'NGN', 'USD', 'EUR', 'GBP', 'ZAR'] as const
export type SupportedCurrency = typeof supportedCurrencies[number]

// Amount validation with business rules
export const transferAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .min(0.01, 'Amount must be at least 0.01')
  .max(1000000, 'Amount cannot exceed 1,000,000')
  .multipleOf(0.01, 'Amount can only have up to 2 decimal places')

// Transfer fee calculation schema
export const transferFeeSchema = z.object({
  amount: transferAmountSchema,
  currency: z.enum(supportedCurrencies),
  transferType: z.enum(['same_company', 'different_company', 'employee_to_employee']),
  isUrgent: z.boolean().default(false)
})

// Employee transfer validation schema
export const employeeTransferSchema = z.object({
  amount: transferAmountSchema,
  currency: z.enum(supportedCurrencies).default('GHS'),
  recipientId: z.string().uuid('Invalid recipient ID'),
  reason: z
    .string()
    .min(1, 'Transfer reason is required')
    .max(200, 'Reason must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,!?()]+$/, 'Reason contains invalid characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  isUrgent: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
})

// Company deposit validation schema
export const companyDepositSchema = z.object({
  amount: transferAmountSchema,
  currency: z.enum(supportedCurrencies).default('GHS'),
  purpose: z.enum([
    'company_deposit',
    'employee_budget',
    'company_budget',
    'operational_funds',
    'emergency_funds'
  ]),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  budgetType: z.enum(['general', 'fuel', 'maintenance', 'supplies', 'other']).optional(),
  employeeId: z.string().uuid().optional(), // Required if purpose is employee_budget
  expiryDate: z.string().optional() // ISO date string
}).refine(data => {
  // If purpose is employee_budget, employeeId is required
  if (data.purpose === 'employee_budget' && !data.employeeId) {
    return false
  }
  return true
}, {
  message: 'Employee ID is required for budget allocation',
  path: ['employeeId']
})

// Budget allocation validation schema
export const budgetAllocationSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  amount: transferAmountSchema,
  currency: z.enum(supportedCurrencies).default('GHS'),
  budgetType: z.enum(['general', 'fuel', 'maintenance', 'supplies', 'other']),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters'),
  expiryDate: z.string().optional(), // ISO date string
  spendingLimit: z
    .number()
    .positive('Spending limit must be positive')
    .max(1000000, 'Spending limit cannot exceed 1,000,000')
    .optional()
})

// Transfer limits validation
export const transferLimitsSchema = z.object({
  dailyLimit: z.number().positive().max(1000000),
  monthlyLimit: z.number().positive().max(10000000),
  singleTransferLimit: z.number().positive().max(1000000),
  currency: z.enum(supportedCurrencies)
})

// Validation helper functions
export function validateTransferLimits(
  amount: number,
  dailyTotal: number,
  monthlyTotal: number,
  limits: z.infer<typeof transferLimitsSchema>
): { isValid: boolean; error?: string } {
  if (amount > limits.singleTransferLimit) {
    return { 
      isValid: false, 
      error: `Single transfer cannot exceed ${limits.currency} ${limits.singleTransferLimit.toLocaleString()}` 
    }
  }
  
  if (dailyTotal + amount > limits.dailyLimit) {
    return { 
      isValid: false, 
      error: `Daily transfer limit of ${limits.currency} ${limits.dailyLimit.toLocaleString()} would be exceeded` 
    }
  }
  
  if (monthlyTotal + amount > limits.monthlyLimit) {
    return { 
      isValid: false, 
      error: `Monthly transfer limit of ${limits.currency} ${limits.monthlyLimit.toLocaleString()} would be exceeded` 
    }
  }
  
  return { isValid: true }
}

// Calculate transfer fees based on business rules
export function calculateTransferFee(
  amount: number,
  transferType: 'same_company' | 'different_company' | 'employee_to_employee',
  isUrgent: boolean = false
): { fee: number; totalAmount: number } {
  let feeRate = 0.01 // 1% default
  
  // Adjust fee based on transfer type
  switch (transferType) {
    case 'same_company':
      feeRate = 0.005 // 0.5%
      break
    case 'different_company':
      feeRate = 0.015 // 1.5%
      break
    case 'employee_to_employee':
      feeRate = 0.01 // 1%
      break
  }
  
  // Urgent transfers have higher fees
  if (isUrgent) {
    feeRate += 0.005 // Additional 0.5%
  }
  
  const fee = amount * feeRate
  const totalAmount = amount + fee
  
  return { fee, totalAmount }
}

// Validate recipient eligibility
export function validateRecipientEligibility(
  recipientRole: string,
  recipientCompanyId: string | null,
  senderCompanyId: string | null
): { isValid: boolean; error?: string } {
  // Only employees can receive transfers
  if (recipientRole !== 'employee') {
    return { 
      isValid: false, 
      error: 'Recipient must be an employee' 
    }
  }
  
  // Check if recipient is active (this would be checked in the database)
  
  return { isValid: true }
}

// Export types
export type EmployeeTransferData = z.infer<typeof employeeTransferSchema>
export type CompanyDepositData = z.infer<typeof companyDepositSchema>
export type BudgetAllocationData = z.infer<typeof budgetAllocationSchema>
export type TransferLimits = z.infer<typeof transferLimitsSchema> 