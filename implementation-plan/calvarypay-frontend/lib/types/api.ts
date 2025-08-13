// Backend Integration Types - Based on CalvaryPay Specifications

export interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  error: {
    code: string
    message: string
    details?: any
  } | null
  meta: {
    correlationId: string
    timestamp: string
    service: string
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiResponse["meta"] & {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export interface JWTPayload {
  sub: string // user-uuid
  email: string
  roles: string[]
  permissions: string[]
  iat: number
  exp: number
  iss: string
  aud: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  permissions: string[]
  organizationId?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId: string
  amount: number // in minor units (cents)
  currency: string
  type: "fuel" | "cash" | "transfer" | "tax"
  status: "pending" | "completed" | "failed" | "cancelled"
  description: string
  metadata: Record<string, any>
  priceSnapshotId?: string
  reconciliationStatus: "unmatched" | "matched" | "disputed"
  createdAt: string
  updatedAt: string
}

export interface PriceSnapshot {
  id: string
  transactionId: string
  fuelType?: string
  pricePerUnit: number
  currency: string
  version: number
  createdAt: string
}

export interface Organization {
  id: string
  name: string
  type: "government" | "transport" | "institution"
  settings: {
    allowedTransactionTypes: string[]
    spendingLimits: Record<string, number>
    approvalRequired: boolean
  }
  createdAt: string
  updatedAt: string
}
