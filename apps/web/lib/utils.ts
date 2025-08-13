import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency with proper symbol and locale
 */
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const currencyMap: Record<string, { symbol: string; locale: string }> = {
    NGN: { symbol: '₦', locale: 'en-NG' },
    USD: { symbol: '$', locale: 'en-US' },
    GHS: { symbol: '₵', locale: 'en-GH' },
    KES: { symbol: 'KSh', locale: 'en-KE' },
    ZAR: { symbol: 'R', locale: 'en-ZA' }
  }

  const config = currencyMap[currency] || currencyMap.NGN

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    // Fallback if Intl.NumberFormat fails
    return `${config.symbol}${amount.toFixed(2)}`
  }
}

/**
 * Format date with relative time
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  // Less than a minute
  if (diffInSeconds < 60) {
    return 'Just now'
  }

  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }

  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  // Less than a week
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  // More than a week, show actual date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format date for display (without relative time)
 */
export function formatDateAbsolute(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
