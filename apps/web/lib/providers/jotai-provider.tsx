/**
 * Jotai Provider
 * Provides Jotai store for global state management
 */

"use client"

import { Provider } from "jotai"

export function JotaiProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>
}
