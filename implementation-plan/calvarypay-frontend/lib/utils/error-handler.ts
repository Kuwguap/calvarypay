// Error handling utilities matching backend specifications

export interface AppError {
  code: string
  message: string
  details?: any
}

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  PAYMENT_ERROR: "PAYMENT_ERROR",
  RECONCILIATION_ERROR: "RECONCILIATION_ERROR",
} as const

export class AppErrorHandler {
  static handle(error: AppError): string {
    switch (error.code) {
      case ERROR_CODES.VALIDATION_ERROR:
        return error.message || "Please check your input and try again."
      case ERROR_CODES.AUTHENTICATION_ERROR:
        return "Please sign in to continue."
      case ERROR_CODES.AUTHORIZATION_ERROR:
        return "You do not have permission to perform this action."
      case ERROR_CODES.NOT_FOUND:
        return "The requested resource was not found."
      case ERROR_CODES.NETWORK_ERROR:
        return "Network error. Please check your connection and try again."
      case ERROR_CODES.PAYMENT_ERROR:
        return "Payment processing failed. Please try again or contact support."
      case ERROR_CODES.RECONCILIATION_ERROR:
        return "Transaction reconciliation failed. This will be reviewed manually."
      default:
        return "An unexpected error occurred. Please try again."
    }
  }

  static isRetryable(error: AppError): boolean {
    return [ERROR_CODES.NETWORK_ERROR, ERROR_CODES.SERVER_ERROR].includes(error.code as any)
  }
}

export function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, delay = 1000): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0

    const attempt = async () => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        attempts++

        if (attempts >= maxAttempts) {
          reject(error)
          return
        }

        const appError = error as AppError
        if (!AppErrorHandler.isRetryable(appError)) {
          reject(error)
          return
        }

        // Exponential backoff with jitter
        const backoffDelay = delay * Math.pow(2, attempts - 1) + Math.random() * 1000
        setTimeout(attempt, backoffDelay)
      }
    }

    attempt()
  })
}
