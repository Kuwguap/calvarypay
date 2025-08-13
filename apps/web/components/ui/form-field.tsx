/**
 * Enhanced Form Field Components with Real-time Validation
 * Provides comprehensive form validation with visual feedback
 */

'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'textarea' | 'select'
  placeholder?: string
  value: string | number
  onChange: (value: string | number) => void
  onBlur?: () => void
  error?: string
  isValidating?: boolean
  isValid?: boolean
  required?: boolean
  disabled?: boolean
  description?: string
  inputClassName?: string
  rows?: number
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  className?: string
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  isValidating,
  isValid,
  required,
  disabled,
  options,
  className,
  inputClassName,
  description,
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleBlur = () => {
    setIsFocused(false)
    setHasInteracted(true)
    onBlur?.()
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const showValidation = hasInteracted && !isFocused
  const showError = showValidation && error
  const showSuccess = showValidation && isValid && !error && value

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    }
    if (showError) {
      return <AlertCircle className="w-4 h-4 text-red-500" />
    }
    if (showSuccess) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    return null
  }

  const getInputClassName = () => {
    const baseClasses = cn(
      'transition-all duration-200',
      inputClassName
    )

    if (showError) {
      return cn(baseClasses, 'border-red-500 focus:border-red-500 focus:ring-red-500/20')
    }
    if (showSuccess) {
      return cn(baseClasses, 'border-green-500 focus:border-green-500 focus:ring-green-500/20')
    }
    if (isFocused) {
      return cn(baseClasses, 'border-blue-500 focus:border-blue-500 focus:ring-blue-500/20')
    }
    return baseClasses
  }

  const renderInput = () => {
    const commonProps = {
      id: name,
      name,
      placeholder,
      value: value as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        onChange(type === 'number' ? Number(e.target.value) : e.target.value),
      onBlur: handleBlur,
      onFocus: handleFocus,
      disabled,
      className: getInputClassName(),
      'aria-invalid': !!error,
      'aria-describedby': error ? `${name}-error` : description ? `${name}-description` : undefined,
    }

    switch (type) {
      case 'textarea':
        return <Textarea {...commonProps} rows={4} />
      
      case 'select':
        return (
          <Select
            value={value as string}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className={getInputClassName()}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      default:
        return (
          <div className="relative">
            <Input
              {...commonProps}
              type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
            />
            {type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        )
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label 
          htmlFor={name}
          className={cn(
            'text-sm font-medium transition-colors',
            showError ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {getValidationIcon()}
      </div>
      
      <div className="relative">
        {renderInput()}
      </div>
      
      {description && !error && (
        <p id={`${name}-description`} className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      
      {showError && (
        <p 
          id={`${name}-error`}
          className="text-xs text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      
      {showSuccess && !error && (
        <p className="text-xs text-green-500 flex items-center gap-1 animate-in slide-in-from-top-1 duration-200">
          <CheckCircle className="w-3 h-3" />
          Valid
        </p>
      )}
    </div>
  )
}

// Loading state component
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-20" />
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
    </div>
  )
}

// Form section wrapper
export function FormSection({ 
  title, 
  description, 
  children, 
  className 
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

// Form Progress Component
interface FormProgressProps {
  progress: number
  className?: string
}

export function FormProgress({ progress, className }: FormProgressProps) {
  return (
    <div className={cn('w-full bg-slate-700 rounded-full h-2', className)}>
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

// Form Error Boundary Component
interface FormErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface FormErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class FormErrorBoundary extends React.Component<FormErrorBoundaryProps, FormErrorBoundaryState> {
  constructor(props: FormErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): FormErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Form Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Something went wrong</h3>
          </div>
          <p className="text-sm text-red-300 mt-2">
            There was an error with the form. Please refresh the page and try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
