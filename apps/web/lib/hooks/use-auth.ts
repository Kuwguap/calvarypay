/**
 * useAuth Hook for CalvaryPay
 * Provides authentication state and methods
 */

import { useAtom } from 'jotai'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { authStore } from '@/lib/store/auth.store'

export interface User {
  userId: string
  email: string
  role: 'customer' | 'employee' | 'merchant' | 'admin'
  firstName?: string
  lastName?: string
  accessToken?: string
  refreshToken?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useAtom(authStore)
  const router = useRouter()

  // Initialize auth state from localStorage on mount (client-side only)
  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Only run on client side
        if (typeof window === 'undefined') return

        const storedUser = localStorage.getItem('calvarypay_user')
        const storedToken = localStorage.getItem('calvarypay_access_token')
        const storedRefreshToken = localStorage.getItem('calvarypay_refresh_token')

        if (storedUser && storedToken) {
          console.log('🔍 Retrieved tokens from localStorage:', {
            storedToken: storedToken?.substring(0, 30) + '...',
            storedRefreshToken: storedRefreshToken?.substring(0, 30) + '...'
          });

          const user = JSON.parse(storedUser)
          setAuthState({
            user: {
              ...user,
              accessToken: storedToken,
              refreshToken: storedRefreshToken
            },
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
        } else {
          setAuthState(prev => ({
            ...prev,
            isLoading: false
          }))
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to initialize authentication'
        })
      }
    }

    // Delay initialization to ensure client-side hydration is complete
    const timer = setTimeout(initializeAuth, 100)
    return () => clearTimeout(timer)
  }, [setAuthState])

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed')
      }

      const user: User = {
        userId: data.user.id,
        email: data.user.email,
        role: data.user.role,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken
      }

      // Store in localStorage (client-side only)
      if (typeof window !== 'undefined') {
        console.log('🔍 Storing tokens:', {
          accessToken: data.tokens.accessToken?.substring(0, 30) + '...',
          refreshToken: data.tokens.refreshToken?.substring(0, 30) + '...'
        });

        localStorage.setItem('calvarypay_user', JSON.stringify({
          userId: user.userId,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }))
        localStorage.setItem('calvarypay_access_token', data.tokens.accessToken)
        if (data.tokens.refreshToken) {
          localStorage.setItem('calvarypay_refresh_token', data.tokens.refreshToken)
        }
      }

      setAuthState({
        user: {
          ...user,
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken
        },
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

      // Redirect based on role
      const roleRoutes = {
        customer: '/dashboard/customer',
        employee: '/dashboard/employee',
        merchant: '/dashboard/company',
        admin: '/dashboard/admin'
      }

      const targetRoute = roleRoutes[user.role] || '/dashboard/customer'
      console.log(`🔄 Redirecting ${user.role} to ${targetRoute}`)
      router.push(targetRoute)

      return { success: true, user }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }, [setAuthState, router])

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout API if refresh token exists (client-side only)
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('calvarypay_refresh_token')
        if (refreshToken) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authState.user?.accessToken}`
            },
            body: JSON.stringify({ refreshToken })
          })
        }
      }
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Clear localStorage (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('calvarypay_user')
        localStorage.removeItem('calvarypay_access_token')
        localStorage.removeItem('calvarypay_refresh_token')
      }

      // Clear auth state
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })

      // Redirect to login
      router.push('/auth/login')
    }
  }, [authState.user?.accessToken, setAuthState, router])

  // Refresh token function
  const refreshToken = useCallback(async () => {
    // Only run on client side
    if (typeof window === 'undefined') return false

    const storedRefreshToken = localStorage.getItem('calvarypay_refresh_token')

    if (!storedRefreshToken) {
      logout()
      return false
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Token refresh failed')
      }

      // Update tokens (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.setItem('calvarypay_access_token', data.accessToken)
        if (data.refreshToken) {
          localStorage.setItem('calvarypay_refresh_token', data.refreshToken)
        }
      }

      setAuthState(prev => ({
        ...prev,
        user: prev.user ? {
          ...prev.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        } : null
      }))

      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      logout()
      return false
    }
  }, [logout, setAuthState])

  // Check if user has specific role
  const hasRole = useCallback((role: string | string[]) => {
    if (!authState.user) return false
    
    if (Array.isArray(role)) {
      return role.includes(authState.user.role)
    }
    
    return authState.user.role === role
  }, [authState.user])

  // Check if user has permission (admin has all permissions)
  const hasPermission = useCallback((permission: string) => {
    if (!authState.user) return false
    
    // Admin has all permissions
    if (authState.user.role === 'admin') return true
    
    // Define role-based permissions
    const rolePermissions: Record<string, string[]> = {
      customer: ['view_own_transactions', 'create_payment', 'view_own_logbook'],
      employee: ['view_own_transactions', 'create_payment', 'view_own_logbook', 'create_logbook_entry'],
      merchant: ['view_company_transactions', 'manage_employees', 'view_company_logbook', 'reconcile_payments'],
      admin: ['*'] // All permissions
    }
    
    const userPermissions = rolePermissions[authState.user.role] || []
    return userPermissions.includes(permission) || userPermissions.includes('*')
  }, [authState.user])

  return {
    // State
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    
    // Methods
    login,
    logout,
    refreshToken,
    hasRole,
    hasPermission
  }
}
