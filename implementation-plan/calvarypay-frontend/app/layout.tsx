import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "CalvaryPay - Centralized Payment Regulation System",
  description:
    "A centralized system for governments and institutions to regulate payments, providing consistent transactional tracking and standardized charging rates.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      style={
        {
          "--font-geist-sans": GeistSans.style.fontFamily,
          "--font-geist-mono": GeistMono.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body className="font-sans">{children}</body>
    </html>
  )
}
