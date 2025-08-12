/**
 * Offline Provider
 * Initializes offline service and provides offline capabilities
 */

"use client"

import { useEffect } from "react"
import { useAtom } from "jotai"
import { offlineService } from "@/lib/services/offline.service"
import { setIsOnlineAtom, setPendingSyncCountAtom, setSyncInProgressAtom } from "@/lib/store/app.store"

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [, setIsOnline] = useAtom(setIsOnlineAtom)
  const [, setPendingSyncCount] = useAtom(setPendingSyncCountAtom)
  const [, setSyncInProgress] = useAtom(setSyncInProgressAtom)

  useEffect(() => {
    // Initialize offline service
    const initOfflineService = async () => {
      try {
        await offlineService.init()
        
        // Update pending sync count
        const pendingItems = await offlineService.getPendingSyncItems()
        setPendingSyncCount(pendingItems.length)
        
        // Start auto sync
        offlineService.startAutoSync()
      } catch (error) {
        console.error("Failed to initialize offline service:", error)
      }
    }

    initOfflineService()

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Trigger sync when coming online
      offlineService.syncWithServer().then((result) => {
        if (result.synced > 0) {
          console.log(`Synced ${result.synced} items`)
        }
        if (result.failed > 0) {
          console.warn(`Failed to sync ${result.failed} items`)
        }
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Set initial online status
    setIsOnline(navigator.onLine)

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      offlineService.stopAutoSync()
    }
  }, [setIsOnline, setPendingSyncCount, setSyncInProgress])

  return <>{children}</>
}
