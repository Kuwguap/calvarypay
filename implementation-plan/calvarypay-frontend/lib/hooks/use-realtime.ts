"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

// Supabase client for real-time updates
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

export function useRealtime<T>(schema: string, table: string, userId?: string, initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const channelName = userId ? `${schema}:${table}:${userId}` : `${schema}:${table}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema,
          table,
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        (payload) => {
          console.log("Real-time update:", payload)

          switch (payload.eventType) {
            case "INSERT":
              setData((prev) => [...prev, payload.new as T])
              break
            case "UPDATE":
              setData((prev) =>
                prev.map((item) => ((item as any).id === (payload.new as any).id ? (payload.new as T) : item)),
              )
              break
            case "DELETE":
              setData((prev) => prev.filter((item) => (item as any).id !== (payload.old as any).id))
              break
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [schema, table, userId])

  return { data, setData, isConnected }
}
