"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { PageLoader } from "@/components/ui/loading-states"

/**
 * Dashboard Redirect Page
 * Redirects users to their appropriate dashboard based on role
 */
export default function DashboardRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) {
      console.log('📍 Dashboard Redirect: Auth loading, waiting...')
      return
    }

    // If not authenticated, redirect to signin
    if (!isAuthenticated || !user) {
      console.log('📍 Dashboard Redirect: Not authenticated, redirecting to signin')
      router.push('/auth/signin')
      return
    }

    // Redirect based on user role
    const roleRoutes = {
      customer: '/dashboard/customer',
      employee: '/dashboard/employee',
      merchant: '/dashboard/company',
      admin: '/dashboard/admin'
    }

    const targetRoute = roleRoutes[user.role] || '/dashboard/customer'
    router.push(targetRoute)
  }, [user, isAuthenticated, isLoading, router])

  // Show loading while determining redirect
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <PageLoader message="Redirecting to your dashboard..." />
    </div>
  )
}
