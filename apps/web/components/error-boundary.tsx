/**
 * Error Boundary Component for CalvaryPay
 * Catches JavaScript errors anywhere in the child component tree
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import Link from 'next/link'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service (e.g., Sentry)
      this.logErrorToService(error, errorInfo)
    }

    this.setState({
      hasError: true,
      error,
      errorInfo,
    })
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // Implementation for error logging service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }
    
    console.log('Error logged:', errorData)
    // In production, send to monitoring service
  }

  private resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-900/50 border-slate-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-white">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-slate-400">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Development Error Details
              </h4>
              <p className="text-xs text-slate-300 font-mono break-all">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                    Stack Trace
                  </summary>
                  <pre className="text-xs text-slate-400 mt-2 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={resetError}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Error ID: {Date.now().toString(36)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Manual error report:', error, errorInfo)
    
    // In a real app, you might want to trigger the error boundary
    // or send the error to a monitoring service
    throw error
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Async error boundary for handling promise rejections
export function AsyncErrorBoundary({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      // You might want to show a toast notification or log to monitoring service
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return <ErrorBoundary>{children}</ErrorBoundary>
}
