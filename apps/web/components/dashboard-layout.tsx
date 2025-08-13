"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  User,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  CreditCard as PaymentIcon,
  BookOpen,
  BarChart3,
  Users,
  DollarSign,
  FileText,
  Wifi,
  WifiOff,
  RefreshCw,
  RefreshCwOff
} from "lucide-react"
import Link from "next/link"
import { authService } from "@/lib/services/auth.service"
import {
  userAtom,
  userRoleAtom,
  userDisplayNameAtom,
  userInitialsAtom,
  clearAuthAtom,
  canAccessAdminAtom,
  canAccessMerchantAtom,
  canManagePricingAtom,
  canAccessReconciliationAtom
} from "@/lib/store/auth.store"
import {
  sidebarOpenAtom,
  toggleSidebarAtom,
  isOnlineAtom,
  syncStatusAtom,
  pendingSyncCountAtom,
  showSuccessNotificationAtom,
  showErrorNotificationAtom
} from "@/lib/store/app.store"

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  roles: string[]
  badge?: string
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Atoms
  const [user] = useAtom(userAtom)
  const [userRole] = useAtom(userRoleAtom)
  const [userDisplayName] = useAtom(userDisplayNameAtom)
  const [userInitials] = useAtom(userInitialsAtom)
  const [sidebarOpen] = useAtom(sidebarOpenAtom)
  const [, toggleSidebar] = useAtom(toggleSidebarAtom)
  const [isOnline] = useAtom(isOnlineAtom)
  const [syncStatus] = useAtom(syncStatusAtom)
  const [pendingSyncCount] = useAtom(pendingSyncCountAtom)
  const [canAccessAdmin] = useAtom(canAccessAdminAtom)
  const [canAccessMerchant] = useAtom(canAccessMerchantAtom)
  const [canManagePricing] = useAtom(canManagePricingAtom)
  const [canAccessReconciliation] = useAtom(canAccessReconciliationAtom)
  const [, clearAuth] = useAtom(clearAuthAtom)
  const [, showSuccessNotification] = useAtom(showSuccessNotificationAtom)
  const [, showErrorNotification] = useAtom(showErrorNotificationAtom)

  const userTypeColors = {
    customer: "bg-green-600/20 text-green-400 border-green-600/30",
    employee: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    merchant: "bg-orange-600/20 text-orange-400 border-orange-600/30",
    admin: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  }

  // Navigation items based on user role
  const navigationItems: NavigationItem[] = [
    {
      href: `/dashboard/${userRole}`,
      icon: Home,
      label: "Dashboard",
      roles: ["customer", "employee", "merchant", "admin"],
    },
    {
      href: "/dashboard/payments",
      icon: PaymentIcon,
      label: "Payments",
      roles: ["customer", "employee", "merchant", "admin"],
    },
    {
      href: "/dashboard/transactions",
      icon: FileText,
      label: "Transactions",
      roles: ["customer", "employee", "merchant", "admin"],
    },
    {
      href: "/dashboard/logbook",
      icon: BookOpen,
      label: "Digital Logbook",
      roles: ["employee", "merchant", "admin"],
      badge: pendingSyncCount > 0 ? pendingSyncCount.toString() : undefined,
    },
    {
      href: "/dashboard/analytics",
      icon: BarChart3,
      label: "Analytics",
      roles: ["merchant", "admin"],
    },
    {
      href: "/dashboard/users",
      icon: Users,
      label: "User Management",
      roles: ["admin"],
    },
    {
      href: "/dashboard/pricing",
      icon: DollarSign,
      label: "Pricing Management",
      roles: ["admin"],
    },
    {
      href: "/dashboard/reconciliation",
      icon: RefreshCw,
      label: "Reconciliation",
      roles: ["admin"],
    },
  ]

  // Filter navigation items based on user role
  const visibleNavItems = navigationItems.filter(item =>
    item.roles.includes(userRole || "customer")
  )

  const handleLogout = async () => {
    try {
      await authService.logout()
      clearAuth()
      showSuccessNotification("Logged out successfully")
      router.push("/auth/signin")
    } catch (error) {
      showErrorNotification("Logout failed. Please try again.")
    }
  }

  const getSyncIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <RefreshCw className="w-4 h-4 animate-spin" />
      case "pending":
        return <RefreshCwOff className="w-4 h-4 text-yellow-400" />
      case "synced":
        return <RefreshCw className="w-4 h-4 text-green-400" />
      default:
        return <RefreshCw className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-slate-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* Desktop sidebar toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex text-slate-300 hover:text-white"
              onClick={toggleSidebar}
            >
              <Menu className="w-4 h-4" />
            </Button>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CalvaryPay</span>
            </div>

            {userRole && (
              <Badge className={userTypeColors[userRole as keyof typeof userTypeColors]}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Connection status */}
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className="hidden sm:inline text-xs text-slate-400">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            {/* Sync status */}
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white relative"
              title={`Sync status: ${syncStatus}`}
            >
              {getSyncIcon()}
              {pendingSyncCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingSyncCount > 99 ? "99+" : pendingSyncCount}
                </span>
              )}
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Bell className="w-4 h-4" />
            </Button>

            {/* Settings */}
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>

            {/* User menu */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-slate-300 text-xs font-medium">
                  {userInitials || "U"}
                </span>
              </div>
              <span className="hidden sm:inline text-slate-300 text-sm">
                {userDisplayName || "User"}
              </span>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={`
          hidden lg:block transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-64" : "w-16"}
          bg-slate-800/30 border-r border-slate-700/50 min-h-screen
        `}>
          <nav className="p-4 space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive = typeof window !== 'undefined' && window.location.pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors relative ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                      : "text-slate-300 hover:bg-slate-700/50"
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!sidebarOpen && item.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative w-64 bg-slate-800 border-r border-slate-700/50 h-full">
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white">CalvaryPay</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-slate-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <nav className="space-y-2">
                  {visibleNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = typeof window !== 'undefined' && window.location.pathname === item.href

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors relative ${
                          isActive
                            ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                            : "text-slate-300 hover:bg-slate-700/50"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen overflow-auto">
          <div className="p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
