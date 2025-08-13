"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, User, Bell, Settings, LogOut } from "lucide-react"
import Link from "next/link"

interface DashboardLayoutProps {
  children: React.ReactNode
  userType: "employee" | "company" | "admin"
  userName: string
  sidebarItems: Array<{
    href: string
    icon: React.ComponentType<{ className?: string }>
    label: string
    active?: boolean
  }>
}

export function DashboardLayout({ children, userType, userName, sidebarItems }: DashboardLayoutProps) {
  const userTypeColors = {
    employee: "bg-green-100 text-green-700 border-green-200",
    company: "bg-blue-100 text-blue-700 border-blue-200",
    admin: "bg-purple-100 text-purple-700 border-purple-200",
  }

  const userTypeIcons = {
    employee: User,
    company: CreditCard,
    admin: CreditCard,
  }

  const UserIcon = userTypeIcons[userType]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-500 via-pink-400 to-amber-300">
      {/* Header */}
      <header className="border-b border-white/20 bg-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white drop-shadow-sm">CalvaryPay</span>
            </div>
            <Badge className={userTypeColors[userType]}>{userType.charAt(0).toUpperCase() + userType.slice(1)}</Badge>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">{userName}</span>
            </div>
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white/10 backdrop-blur-sm border-r border-white/20 min-h-screen">
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    item.active
                      ? "bg-white/20 text-white border border-white/30 backdrop-blur-sm font-medium"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
