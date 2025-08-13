"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@/lib/types/api"
import { apiClient } from "@/lib/api/client"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  refreshToken: () => Promise<boolean>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load token from localStorage on mount
    const savedToken = localStorage.getItem("calvary_token")
    if (savedToken) {
      setToken(savedToken)
      apiClient.setToken(savedToken)
      validateToken(savedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async (token: string) => {
    try {
      const response = await apiClient.get<User>("/auth/me")
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        // Token is invalid
        logout()
      }
    } catch (error) {
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post<{ user: User; token: string; refreshToken: string }>("/auth/login", {
        email,
        password,
      })

      if (response.success && response.data) {
        const { user, token, refreshToken } = response.data
        setUser(user)
        setToken(token)
        apiClient.setToken(token)
        localStorage.setItem("calvary_token", token)
        localStorage.setItem("calvary_refresh_token", refreshToken)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    apiClient.setToken("")
    localStorage.removeItem("calvary_token")
    localStorage.removeItem("calvary_refresh_token")
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("calvary_refresh_token")
      if (!refreshToken) return false

      const response = await apiClient.post<{ token: string; refreshToken: string }>("/auth/refresh", {
        refreshToken,
      })

      if (response.success && response.data) {
        const { token: newToken, refreshToken: newRefreshToken } = response.data
        setToken(newToken)
        apiClient.setToken(newToken)
        localStorage.setItem("calvary_token", newToken)
        localStorage.setItem("calvary_refresh_token", newRefreshToken)
        return true
      }
      return false
    } catch (error) {
      logout()
      return false
    }
  }

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false
  }

  const hasRole = (role: string): boolean => {
    return user?.roles.includes(role) || false
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshToken,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
