/**
 * Notification System for CalvaryPay
 * Toast notifications with different types and animations
 */

'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll,
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

function NotificationItem({ 
  notification, 
  onRemove 
}: { 
  notification: Notification
  onRemove: () => void 
}) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-100'
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-100'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-100'
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-100'
    }
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border backdrop-blur-sm shadow-lg animate-in slide-in-from-right-full duration-300',
        getStyles()
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium">{notification.title}</h4>
          {notification.message && (
            <p className="text-xs opacity-90 mt-1">{notification.message}</p>
          )}
          
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="text-xs underline mt-2 hover:no-underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={onRemove}
          className="flex-shrink-0 text-white/60 hover:text-white/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Convenience hooks for different notification types
export function useSuccessNotification() {
  const { addNotification } = useNotifications()
  
  return useCallback((title: string, message?: string) => {
    addNotification({ type: 'success', title, message })
  }, [addNotification])
}

export function useErrorNotification() {
  const { addNotification } = useNotifications()
  
  return useCallback((title: string, message?: string) => {
    addNotification({ type: 'error', title, message })
  }, [addNotification])
}

export function useWarningNotification() {
  const { addNotification } = useNotifications()
  
  return useCallback((title: string, message?: string) => {
    addNotification({ type: 'warning', title, message })
  }, [addNotification])
}

export function useInfoNotification() {
  const { addNotification } = useNotifications()
  
  return useCallback((title: string, message?: string) => {
    addNotification({ type: 'info', title, message })
  }, [addNotification])
}

// Global notification functions (for use outside React components)
let globalNotificationHandler: ((notification: Omit<Notification, 'id'>) => void) | null = null

export function setGlobalNotificationHandler(handler: (notification: Omit<Notification, 'id'>) => void) {
  globalNotificationHandler = handler
}

export function showGlobalNotification(notification: Omit<Notification, 'id'>) {
  if (globalNotificationHandler) {
    globalNotificationHandler(notification)
  } else {
    console.warn('Global notification handler not set')
  }
}

export function showSuccessNotification(title: string, message?: string) {
  showGlobalNotification({ type: 'success', title, message })
}

export function showErrorNotification(title: string, message?: string) {
  showGlobalNotification({ type: 'error', title, message })
}

export function showWarningNotification(title: string, message?: string) {
  showGlobalNotification({ type: 'warning', title, message })
}

export function showInfoNotification(title: string, message?: string) {
  showGlobalNotification({ type: 'info', title, message })
}
