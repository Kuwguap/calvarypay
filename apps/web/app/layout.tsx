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
import { ClientOnly } from "@/components/client-only"

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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <AsyncErrorBoundary>
          <JotaiProvider>
            <QueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem={false}
                disableTransitionOnChange
              >
                <NotificationProvider>
                  <ClientOnly>
                    <OfflineProvider>
                      {children}
                    </OfflineProvider>
                  </ClientOnly>
                </NotificationProvider>
              </ThemeProvider>
            </QueryProvider>
          </JotaiProvider>
        </AsyncErrorBoundary>
      </body>
    </html>
  )
}
