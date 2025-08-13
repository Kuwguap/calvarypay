/**
 * Loading States Components for CalvaryPay
 * Consistent loading indicators and skeleton screens
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, CreditCard } from 'lucide-react'

// Basic spinner component
export function Spinner({ 
  size = 'md', 
  className 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <Loader2 
      className={cn(
        'animate-spin text-blue-500',
        sizeClasses[size],
        className
      )} 
    />
  )
}

// Full page loading screen
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center animate-pulse">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <Spinner size="lg" />
          <p className="text-slate-400 text-sm">{message}</p>
        </div>
      </div>
    </div>
  )
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-slate-900/50 border border-slate-800 rounded-lg p-6 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-700 rounded animate-pulse w-24" />
        <div className="h-8 w-8 bg-slate-700 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-slate-700 rounded animate-pulse w-32" />
        <div className="h-3 bg-slate-700 rounded animate-pulse w-20" />
      </div>
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-700 rounded animate-pulse" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-6 bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-slate-700 rounded animate-pulse w-64" />
        <div className="h-4 bg-slate-800 rounded animate-pulse w-48" />
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Main content */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-slate-700 rounded animate-pulse w-48" />
              <div className="h-4 bg-slate-800 rounded animate-pulse w-32" />
            </div>
            <div className="flex space-x-2">
              <div className="h-10 bg-slate-700 rounded animate-pulse w-32" />
              <div className="h-10 bg-slate-700 rounded animate-pulse w-24" />
            </div>
          </div>
          <TableSkeleton />
        </div>
      </div>
    </div>
  )
}

// Form skeleton
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-slate-700 rounded animate-pulse w-20" />
          <div className="h-10 bg-slate-800 rounded animate-pulse w-full" />
        </div>
      ))}
      <div className="h-10 bg-slate-700 rounded animate-pulse w-full" />
    </div>
  )
}

// Button loading state
export function ButtonLoader({ 
  children, 
  isLoading, 
  loadingText = 'Loading...',
  className,
  ...props 
}: {
  children: React.ReactNode
  isLoading: boolean
  loadingText?: string
  className?: string
  [key: string]: any
}) {
  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center',
        isLoading && 'cursor-not-allowed opacity-50',
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Inline loader for content areas
export function InlineLoader({ 
  message = 'Loading...', 
  size = 'md',
  className 
}: { 
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <div className="text-center space-y-2">
        <Spinner size={size} />
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
    </div>
  )
}

// Progress bar
export function ProgressBar({ 
  progress, 
  className,
  showPercentage = true 
}: { 
  progress: number
  className?: string
  showPercentage?: boolean 
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100)
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <p className="text-xs text-slate-400 text-center">
          {clampedProgress.toFixed(0)}%
        </p>
      )}
    </div>
  )
}

// Pulse animation for loading states
export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}
