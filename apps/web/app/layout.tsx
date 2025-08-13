import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/lib/providers/query-provider"
import { JotaiProvider } from "@/lib/providers/jotai-provider"
import { OfflineProvider } from "@/lib/providers/offline-provider"
import { AsyncErrorBoundary } from "@/components/error-boundary"
import { NotificationProvider } from "@/components/ui/notification-system"

export const metadata: Metadata = {
  title: "CalvaryPay - Digital Payment & Logbook Platform",
  description:
    "A comprehensive digital payment and logbook management platform with offline capabilities, real-time reconciliation, and enterprise-grade security.",
  generator: "CalvaryPay",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <AsyncErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <JotaiProvider>
                <OfflineProvider>
                  <NotificationProvider>
                    {children}
                  </NotificationProvider>
                </OfflineProvider>
              </JotaiProvider>
            </QueryProvider>
          </ThemeProvider>
        </AsyncErrorBoundary>
      </body>
    </html>
  )
}
