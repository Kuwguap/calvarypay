import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/lib/providers/query-provider"
import { JotaiProvider } from "@/lib/providers/jotai-provider"
import { OfflineProvider } from "@/lib/providers/offline-provider"

export const metadata: Metadata = {
  title: "EliteePay - Digital Payment & Logbook Platform",
  description:
    "A comprehensive digital payment and logbook management platform with offline capabilities, real-time reconciliation, and enterprise-grade security.",
  generator: "EliteePay",
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
        <JotaiProvider>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <OfflineProvider>
                {children}
              </OfflineProvider>
            </ThemeProvider>
          </QueryProvider>
        </JotaiProvider>
      </body>
    </html>
  )
}
