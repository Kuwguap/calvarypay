/**
 * Role-Based Route Protection for CalvaryPay
 * Handles authentication and authorization for different user roles
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAtom } from 'jotai'
import { userAtom, loginLoadingAtom } from '@/lib/store/auth.store'
import { PageLoader } from '@/components/ui/loading-states'
import { useErrorNotification } from '@/components/ui/notification-system'

export type UserRole = 'customer' | 'employee' | 'merchant' | 'admin'

interface RouteConfig {
  path: string
  allowedRoles: UserRole[]
  redirectTo?: string
}

// Define route configurations
const routeConfigs: RouteConfig[] = [
  // Public routes (no authentication required)
  { path: '/', allowedRoles: ['customer', 'employee', 'merchant', 'admin'] },
  { path: '/auth/signin', allowedRoles: ['customer', 'employee', 'merchant', 'admin'] },
  { path: '/auth/signup', allowedRoles: ['customer', 'employee', 'merchant', 'admin'] },
  { path: '/auth/forgot-password', allowedRoles: ['customer', 'employee', 'merchant', 'admin'] },
  
  // Customer routes
  { path: '/dashboard/customer', allowedRoles: ['customer'], redirectTo: '/auth/signin' },
  
  // Employee routes
  { path: '/dashboard/employee', allowedRoles: ['employee'], redirectTo: '/auth/signin' },
  
  // Merchant/Company routes
  { path: '/dashboard/company', allowedRoles: ['merchant'], redirectTo: '/auth/signin' },
  
  // Admin routes
  { path: '/dashboard/admin', allowedRoles: ['admin'], redirectTo: '/auth/signin' },
  
  // Shared authenticated routes
  { path: '/profile', allowedRoles: ['customer', 'employee', 'merchant', 'admin'], redirectTo: '/auth/signin' },
  { path: '/settings', allowedRoles: ['customer', 'employee', 'merchant', 'admin'], redirectTo: '/auth/signin' },
]

// Get default dashboard route for user role
export function getDefaultDashboardRoute(role: UserRole): string {
  const dashboardRoutes = {
    customer: '/dashboard/customer',
    employee: '/dashboard/employee',
    merchant: '/dashboard/company',
    admin: '/dashboard/admin',
  }
  return dashboardRoutes[role] || '/dashboard/customer'
}

// Check if user has access to a specific route
export function hasRouteAccess(userRole: UserRole | null, path: string): boolean {
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/signin', '/auth/signup', '/auth/forgot-password', '/terms', '/privacy']
  
  if (publicRoutes.includes(path)) {
    return true
  }
  
  if (!userRole) {
    return false
  }
  
  const config = routeConfigs.find(config => path.startsWith(config.path))
  if (!config) {
    // If no specific config found, allow access for authenticated users
    return true
  }
  
  return config.allowedRoles.includes(userRole)
}

// Get redirect route for unauthorized access
export function getRedirectRoute(userRole: UserRole | null, path: string): string {
  if (!userRole) {
    return '/auth/signin'
  }
  
  const config = routeConfigs.find(config => path.startsWith(config.path))
  if (config && !config.allowedRoles.includes(userRole)) {
    return config.redirectTo || getDefaultDashboardRoute(userRole)
  }
  
  return getDefaultDashboardRoute(userRole)
}

// Route protection component
interface RouteProtectionProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallbackRoute?: string
}

export function RouteProtection({ 
  children, 
  requiredRoles = [], 
  fallbackRoute = '/auth/signin' 
}: RouteProtectionProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user] = useAtom(userAtom)
  const [isLoading] = useAtom(loginLoadingAtom)
  const [isChecking, setIsChecking] = useState(true)
  const showError = useErrorNotification()

  useEffect(() => {
    const checkAccess = async () => {
      setIsChecking(true)
      
      // Wait for auth state to be determined
      if (isLoading) {
        console.log('🔒 Route Protection: Auth still loading, waiting...')
        return
      }
      
      // Check if route requires authentication
      const publicRoutes = ['/', '/auth/signin', '/auth/signup', '/auth/forgot-password', '/terms', '/privacy']
      const isPublicRoute = publicRoutes.includes(pathname)
      
      if (isPublicRoute) {
        console.log('🔒 Route Protection: Public route, allowing access')
        setIsChecking(false)
        return
      }
      
      // Check if user is authenticated
      if (!user) {
        console.log('🔒 Route Protection: User not authenticated, redirecting to signin')
        router.push('/auth/signin')
        return
      }
      
      // Check role-based access
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role as UserRole)) {
        console.log(`🚫 User role ${user.role} not authorized for ${pathname}`)
        // Only show error if user is trying to access a different role's dashboard
        const isDashboardRoute = pathname.startsWith('/dashboard/')
        if (isDashboardRoute) {
          // Silent redirect to correct dashboard
          router.push(getDefaultDashboardRoute(user.role as UserRole))
        } else {
          showError('Access Denied', 'You do not have permission to access this page')
          router.push(getDefaultDashboardRoute(user.role as UserRole))
        }
        return
      }

      // Check general route access
      if (!hasRouteAccess(user.role as UserRole, pathname)) {
        console.log(`🚫 Route access denied for ${user.role} to ${pathname}`)
        // Only show error for non-dashboard routes
        const isDashboardRoute = pathname.startsWith('/dashboard/')
        if (isDashboardRoute) {
          // Silent redirect to correct dashboard
          router.push(getDefaultDashboardRoute(user.role as UserRole))
        } else {
          showError('Access Denied', 'You do not have permission to access this page')
          router.push(getRedirectRoute(user.role as UserRole, pathname))
        }
        return
      }
      
      setIsChecking(false)
    }
    
    checkAccess()
  }, [user, isLoading, pathname, router, requiredRoles, fallbackRoute, showError])

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return <PageLoader message="Checking permissions..." />
  }

  return <>{children}</>
}

// Higher-order component for route protection
export function withRouteProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: UserRole[],
  fallbackRoute?: string
) {
  const ProtectedComponent = (props: P) => (
    <RouteProtection requiredRoles={requiredRoles} fallbackRoute={fallbackRoute}>
      <Component {...props} />
    </RouteProtection>
  )
  
  ProtectedComponent.displayName = `withRouteProtection(${Component.displayName || Component.name})`
  
  return ProtectedComponent
}

// Hook for checking current user permissions
export function usePermissions() {
  const [user] = useAtom(userAtom)
  const pathname = usePathname()
  
  return {
    user,
    role: user?.role as UserRole | null,
    hasAccess: (path: string) => hasRouteAccess(user?.role as UserRole | null, path),
    canAccess: (roles: UserRole[]) => user && roles.includes(user.role as UserRole),
    isAdmin: user?.role === 'admin',
    isMerchant: user?.role === 'merchant',
    isEmployee: user?.role === 'employee',
    isCustomer: user?.role === 'customer',
    defaultDashboard: user ? getDefaultDashboardRoute(user.role as UserRole) : '/auth/signin',
  }
}

// Component for conditional rendering based on roles
interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { canAccess } = usePermissions()
  
  if (!canAccess(allowedRoles)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Navigation helper for role-based routing
export function useRoleBasedNavigation() {
  const router = useRouter()
  const { role, defaultDashboard } = usePermissions()
  
  const navigateToDashboard = () => {
    router.push(defaultDashboard)
  }
  
  const navigateToRole = (targetRole: UserRole) => {
    router.push(getDefaultDashboardRoute(targetRole))
  }
  
  const canNavigateTo = (path: string) => {
    return hasRouteAccess(role, path)
  }
  
  return {
    navigateToDashboard,
    navigateToRole,
    canNavigateTo,
    defaultDashboard,
  }
}
