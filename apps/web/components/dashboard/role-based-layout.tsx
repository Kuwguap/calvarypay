/**
 * Role-Based Dashboard Layout for CalvaryPay
 * Provides different navigation and layout based on user role
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAtom } from 'jotai'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  User,
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  DollarSign,
  Building2,
  Shield,
  Users,
  BarChart3,
  FileText,
  Wallet,
  Receipt,
  PieChart,
  Activity,
  Send
} from 'lucide-react'
import { userAtom } from '@/lib/store/auth.store'
import { usePermissions, type UserRole } from '@/lib/auth/route-protection'
import { authService } from '@/lib/services/auth.service'

interface NavigationItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  badge?: string
}

// Define navigation items for different roles
const navigationItems: NavigationItem[] = [
  // Customer Navigation
  { label: 'Overview', href: '/dashboard/customer', icon: TrendingUp, roles: ['customer'] },
  { label: 'Transactions', href: '/dashboard/customer/transactions', icon: Receipt, roles: ['customer'] },
  { label: 'Make Payment', href: '/dashboard/customer/payments', icon: DollarSign, roles: ['customer'] },
  { label: 'Wallet', href: '/dashboard/customer/wallet', icon: Wallet, roles: ['customer'] },
  
  // Employee Navigation
  { label: 'Overview', href: '/dashboard/employee', icon: TrendingUp, roles: ['employee'], badge: 'notifications' },
  { label: 'Quick Pay', href: '/dashboard/employee/quick-pay', icon: Send, roles: ['employee'] },
  { label: 'Transactions', href: '/dashboard/employee/transactions', icon: Receipt, roles: ['employee'] },
  { label: 'Reports', href: '/dashboard/employee/reports', icon: FileText, roles: ['employee'] },
  
  // Merchant Navigation
  { label: 'Overview', href: '/dashboard/company', icon: TrendingUp, roles: ['merchant'] },
  { label: 'Transactions', href: '/dashboard/company/transactions', icon: Receipt, roles: ['merchant'] },
  { label: 'Analytics', href: '/dashboard/company/analytics', icon: BarChart3, roles: ['merchant'] },
  { label: 'Employees', href: '/dashboard/company/employees', icon: Users, roles: ['merchant'] },
  { label: 'Settings', href: '/dashboard/company/settings', icon: Settings, roles: ['merchant'] },
  
  // Admin Navigation
  { label: 'Overview', href: '/dashboard/admin', icon: TrendingUp, roles: ['admin'] },
  { label: 'Users', href: '/dashboard/admin/users', icon: Users, roles: ['admin'] },
  { label: 'Companies', href: '/dashboard/admin/companies', icon: Building2, roles: ['admin'] },
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: PieChart, roles: ['admin'] },
  { label: 'System', href: '/dashboard/admin/system', icon: Activity, roles: ['admin'] },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings, roles: ['admin'] },
]

// Get role-specific navigation items
function getRoleNavigation(role: UserRole): NavigationItem[] {
  return navigationItems.filter(item => item.roles.includes(role))
}

// Get role display information
function getRoleInfo(role: UserRole) {
  const roleInfo = {
    customer: { label: 'Customer', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: User },
    employee: { label: 'Employee', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: User },
    merchant: { label: 'Merchant', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Building2 },
    admin: { label: 'Administrator', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Shield },
  }
  return roleInfo[role] || roleInfo.customer
}

interface RoleBasedLayoutProps {
  children: React.ReactNode
}

export function RoleBasedLayout({ children }: RoleBasedLayoutProps) {
  const pathname = usePathname()
  const [user] = useAtom(userAtom)
  const { role } = usePermissions()

  if (!user || !role) {
    return null
  }

  const navigation = getRoleNavigation(role)
  const roleInfo = getRoleInfo(role)
  const RoleIcon = roleInfo.icon

  const handleLogout = () => {
    authService.logout()
    window.location.href = '/auth/signin'
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CalvaryPay</span>
            </div>
            <Badge className={cn('font-medium', roleInfo.color)}>
              <RoleIcon className="w-3 h-3 mr-1" />
              {roleInfo.label}
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 relative">
              <Bell className="w-4 h-4" />
              {role === 'employee' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-700">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-slate-400 text-xs">{roleInfo.label}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/50 border-r border-slate-800 min-h-screen">
          <nav className="p-6 space-y-1">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Navigation
              </h3>
            </div>
            
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.badge === 'notifications' && role === 'employee' && (
                    <Badge variant="secondary" className="ml-auto text-xs bg-red-500/20 text-red-400 border-red-500/30">
                      New
                    </Badge>
                  )}
                  {item.badge && item.badge !== 'notifications' && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
            
            {/* Common Navigation Items */}
            <div className="pt-6 mt-6 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Account
              </h3>
              <Link
                href="/profile"
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200',
                  pathname === '/profile'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                )}
              >
                <User className="w-5 h-5" />
                <span>Profile</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Role-specific layout components
export function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <RoleBasedLayout>{children}</RoleBasedLayout>
}

export function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <RoleBasedLayout>{children}</RoleBasedLayout>
}

export function MerchantLayout({ children }: { children: React.ReactNode }) {
  return <RoleBasedLayout>{children}</RoleBasedLayout>
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleBasedLayout>{children}</RoleBasedLayout>
}
