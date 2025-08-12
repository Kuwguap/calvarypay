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
    employee: "bg-green-600/20 text-green-400 border-green-600/30",
    company: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    admin: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CalvaryPay</span>
            </div>
            <Badge className={userTypeColors[userType]}>{userType.charAt(0).toUpperCase() + userType.slice(1)}</Badge>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-slate-300 text-sm">{userName}</span>
            </div>
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <LogOut className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800/30 border-r border-slate-700/50 min-h-screen">
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${
                    item.active
                      ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                      : "text-slate-300 hover:bg-slate-700/50"
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
