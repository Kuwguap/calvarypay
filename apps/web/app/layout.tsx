import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { JotaiProvider } from "@/lib/providers/jotai-provider"
import { RedisQueryProvider } from "@/lib/providers/redis-query-provider"
import { OfflineProvider } from "@/lib/providers/offline-provider"
import { NotificationProvider } from "@/components/ui/notification-system"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CalvaryPay - Digital Payment Solutions",
  description: "Secure, fast, and reliable digital payment solutions for businesses and individuals",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CalvaryPay",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e293b",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <JotaiProvider>
          <RedisQueryProvider>
            <NotificationProvider>
              <OfflineProvider>
                {children}
              </OfflineProvider>
            </NotificationProvider>
          </RedisQueryProvider>
        </JotaiProvider>
      </body>
    </html>
  )
}
